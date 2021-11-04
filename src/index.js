const express = require("express");
const cors = require("cors");
const AWS = require("aws-sdk");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mime = require("mime-types");
const csvtojson = require("csvtojson/v2");
const urlToTitle = require("url-to-title");
const urlParse = require("url-parse");
require("dotenv").config();
const {
  parseCompanies,
  writeCompaniesToDB,
  formatCompany,
  formatCompanyLookup,
  formatPutRequestToCompany,
  formatCompaniesToGetRequest,
  formatPutRequestToCompanyMedia,
  readCompaniesFromDB,
  formatRequestToCompanyLookup,
  scanElements,
} = require("./helpers");

const app = express();
const multerConfig = {
  limits: {
    fields: 1,
    fileSize: 100000,
    parts: 1,
  },
};
const upload = multer(multerConfig).single("companies");
const saltRounds = 10;
const port = process.env.PORT || 3000;
AWS.config.update({
  region: "us-east-2",
  secretAccessKey: process.env.AWS_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
});
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ extended: true }));

app.get("/companies-count", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")?.[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(401).json({ message: "Not authorized" });
    } else {
      const params = {
        TableName: "companies-lookup",
      };
      dynamodb.scan(params, (err, data) => {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ message: "We exprected technical details..." });
        } else {
          res.json({ count: data.Count });
        }
      });
    }
  });
});

app.get("/companies", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")?.[1];
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      res.status(401).json({ message: "Not authorized" });
    } else {
      await scanElements(dynamodb, "companies")
        .then((data) => {
          const formattedResult = data.map((e) => formatPutRequestToCompany(e));
          res.json(formattedResult);
        })
        .catch(() => {
          res
            .status(500)
            .json({ message: "We exprected technical details..." });
        });
    }
  });
});

app.get("/most-searches", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")?.[1];
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      res.status(401).json({ message: "Not authorized" });
    } else {
      const data = await scanElements(dynamodb, "companies-lookup", {
        //IndexName: "id-search_count-index",
        //Select: "ALL_ATTRIBUTES",
        //Limit: 10,
        ProjectionExpression: "id, title, search_count",
      });
      const formattedData = data
        .map(formatRequestToCompanyLookup)
        .sort((a, b) => (b.search_count > a.search_count ? 1 : -1))
        .slice(0, 10);
      const promises = formattedData.map(async (company) => {
        return scanElements(dynamodb, "companies", {
          FilterExpression: "original_id = :original_id",
          ExpressionAttributeValues: {
            ":original_id": { S: String(company.id) },
          },
          ProjectionExpression: "media",
        })
          .then((data) => {
            const media = data?.map(formatPutRequestToCompanyMedia).flat();
            return { ...company, media };
          })
          .catch((err) => {
            console.log(err);
          });
      });
      const result = (await Promise.all(promises)).flat();
      res.json(result);
    }
  });
});

app.get("/search", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")?.[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(401).json({ message: "Not authorized" });
    } else {
      const query = req.query?.query?.toLowerCase();
      if (query) {
        const params = {
          TableName: "companies-lookup",
          FilterExpression: "contains(#lower_title, :lower_title)",
          ExpressionAttributeNames: {
            "#lower_title": "lower_title",
          },
          ExpressionAttributeValues: {
            ":lower_title": { S: query },
          },
          ProjectionExpression: "lower_title, id, title, search_count",
        };
        new Promise((resolve, reject) => {
          dynamodb.scan(params, async function (err, data) {
            if (err) {
              console.log("Error", err);
            } else {
              const items = data.Items;
              const originCompanies = items.map((item) => ({
                id: item.id.S,
                title: item.title.S,
                search_count: item.search_count?.N || 0,
              }));
              const companiesWithCounter = originCompanies.map((e) => ({
                ...e,
                search_count: (e.search_count ? +e.search_count : 0) + 1,
              }));
              companiesWithCounter.forEach((company) => {
                const params = {
                  TableName: "companies-lookup",
                  Key: {
                    id: company.id,
                  },
                  UpdateExpression: "set search_count = :s",
                  ExpressionAttributeValues: {
                    ":s": company.search_count,
                  },
                  ReturnValues: "UPDATED_NEW",
                };
                docClient.update(params, function (err, data) {
                  if (err) {
                    console.error(
                      "Unable to update item. Error JSON:",
                      JSON.stringify(err, null, 2)
                    );
                  } else {
                    console.log(
                      "UpdateItem succeeded:",
                      JSON.stringify(data, null, 2)
                    );
                  }
                });
              });
              if (originCompanies.length < 10) {
                const promises = originCompanies.map(async (originCompany) => {
                  return scanElements(dynamodb, "companies", {
                    FilterExpression: "original_id = :original_id",
                    ExpressionAttributeValues: {
                      ":original_id": { S: String(originCompany.id) },
                    },
                    ProjectionExpression: "media",
                  })
                    .then((data) => {
                      const media = data
                        ?.map(formatPutRequestToCompanyMedia)
                        .flat();
                      return { ...originCompany, media };
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                });
                const result = (await Promise.all(promises)).flat();
                resolve(result);
              } else {
                scanElements(dynamodb, "companies", {}).then((data) => {
                  const filteredData = data.map(formatPutRequestToCompany);
                  const result = originCompanies.map((originCompany) => {
                    const media = filteredData
                      .filter((e) => e.original_id === originCompany.id)
                      .map((e) => e.media)
                      .flat();
                    return {
                      id: originCompany.id,
                      title: originCompany.title,
                      media,
                    };
                  });
                  resolve(result);
                });
              }
            }
          });
        }).then((data) => {
          res.json(data);
        });
      }
    }
  });
});

app.post(
  "/auth/registration",
  body("email").isEmail(),
  body("password").isLength({ min: 5, max: 100 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(req.body.password, salt, function (err, hash) {
        if (err) {
          return res
            .status(500)
            .json({ message: "We exprected technical details..." });
        } else {
          const newUser = {
            email: req.body.email,
            password: hash,
          };
          const getParams = {
            TableName: "users",
            Key: {
              email: { S: newUser.email },
            },
            ProjectionExpression: "email",
          };
          dynamodb.getItem(getParams, function (err, data) {
            if (err) {
              return res
                .status(500)
                .json({ message: "We expected technical details..." });
            } else {
              if (!Object.keys(data).length) {
                const putParams = {
                  TableName: "users",
                  Item: {
                    email: { S: newUser.email },
                    password: { S: newUser.password },
                  },
                };
                dynamodb.putItem(putParams, function (err, data) {
                  if (err) {
                    return res
                      .status(500)
                      .json({ message: "We expected technical details..." });
                  } else {
                    return res.status(201).json({ email: newUser.email });
                  }
                });
              } else {
                return res.status(403).json({ message: "User already exist" });
              }
            }
          });
        }
      });
    });
  }
);

app.post(
  "/auth/login",
  body("email").isEmail(),
  body("password").isLength({ min: 5, max: 100 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const email = req.body.email;
    const password = req.body.password;

    const getParams = {
      TableName: "users",
      Key: {
        email: { S: email },
      },
      ProjectionExpression: "password",
    };
    dynamodb.getItem(getParams, (err, data) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ message: "We expected technical details..." });
      } else {
        if (!Object.keys(data).length) {
          return res.status(403).json({ message: "Wrong email or password" });
        } else {
          const hash = data.Item.password.S;
          bcrypt.compare(password, hash, (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "We expected technical details..." });
            } else {
              if (result) {
                jwt.sign(
                  { email, password },
                  process.env.JWT_SECRET,
                  { expiresIn: "12h" },
                  (err, token) => {
                    if (err) {
                      return res
                        .status(500)
                        .json({ message: "We expected technical details..." });
                    } else {
                      return res.status(201).json({ access_token: token });
                    }
                  }
                );
              } else {
                return res
                  .status(403)
                  .json({ message: "Wrong email or password" });
              }
            }
          });
        }
      }
    });
  }
);

app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      const error = err.message;
      switch (error) {
        case "File too large":
          return res.status(413).send({ message: error });
        default:
          return res.status(400).send({ message: error });
      }
    } else if (err) {
      console.log(err);
      return res
        .status(500)
        .json({ message: "We expected technical details..." });
    } else {
      const xlsxType = mime.lookup("xlsx");
      const csvType = mime.lookup("csv");
      const file = req.file;
      let readedData = null;
      if (file?.mimetype === xlsxType) {
        const data = await file.buffer;
        readedData = parseCompanies(data);
      } else if (file?.mimetype === csvType) {
        const data = await csvtojson().fromString(req.file.buffer.toString());

        const formattedData = data?.map((company) => ({
          id: company["AMPLYFI_NBR"],
          title: company["Company"],
          lower_title: company["Company"].toLowerCase(),
          country: company["Country Name"],
          nace_code: company["NACE Code"],
          activity_group_name: company["Ativity group name"],
          street: company["Street"],
          city: company["City"],
          postcode: company["Postcode"],
          lang_address: company["Lang Address"],
          holding_company: company["HOLDING_COMPANY"],
          holdpostal_code: company["HOLDPOSTAL_CODE"],
          holdcountry_code: company["HOLDCOUNTRY_CODE"],
          holdaddr_city: company["HOLDADDR_CITY"],
          holdline_addr_1: company["HOLDLINE_ADDR_1"],
          company_main_siren_fra_id: company["company_main.siren/ FRA ID"],
          media: company["Media URLs"] ? [company["Media URLs"]] : [],
        }));
        const result = [];
        let company = {};
        formattedData.forEach((el, elKey) => {
          if (el.id && el.title && company.id && company.title) {
            result.push(company);
            company = {};
          }
          if (!el.id && !el.title && el.media) {
            company["media"] = company.media
              ? [...company.media, ...el.media]
              : el.media;
          }
          if (el.id && el.title && !company.id && !company.title) {
            company = el;
          }
          if (elKey === formattedData.length - 1) {
            result.push(company);
          }
        });
        if (!result || !result.length) {
          return res.status(204).send();
        } else {
          readedData = result;
        }
      } else {
        return res.status(402).json({ message: "Incorrect file type" });
      }
      if (!readedData || !readedData.length) {
        return res.status(204).send();
      } else {
        const newCompanies = (
          await readCompaniesFromDB(
            dynamodb,
            "companies-lookup",
            readedData,
            formatCompaniesToGetRequest
          )
        ).notFoundData;
        const addedCompanies = await writeCompaniesToDB(
          dynamodb,
          "companies-lookup",
          newCompanies,
          formatCompanyLookup
        );
        const companiesWithMedia = await Promise.all(
          readedData
            .filter((e) => e.media && e.media.length > 0)
            .map(async ({ id, title, media }) => {
              const titles = await urlToTitle(media);
              return {
                id,
                title,
                media: media.map((url, index) => ({
                  url,
                  title: titles[index] || urlParse(url).pathname,
                })),
                original_id: id,
              };
            })
        );
        const readedCompaniesWithMedia = (
          await readCompaniesFromDB(
            dynamodb,
            "companies",
            companiesWithMedia,
            formatCompaniesToGetRequest,
            formatPutRequestToCompany
          )
        ).findedData;
        const companiesWithJoinedMedia = companiesWithMedia.map((el) => {
          const readedElement = readedCompaniesWithMedia.find(
            (e) => e.id === el.id
          );
          const readedMedia = readedElement?.media || [];
          const newMedia = el.media.filter(
            (mediaEl) => !readedMedia.find((e) => e.url === mediaEl.url)
          );
          return {
            ...el,
            media: [...readedMedia, ...newMedia],
          };
        });
        writeCompaniesToDB(
          dynamodb,
          "companies",
          companiesWithJoinedMedia,
          formatCompany
        );
        return res.json({ count: addedCompanies.length });
      }
    }
  });
});

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});
