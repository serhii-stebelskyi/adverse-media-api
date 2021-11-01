module.exports.formatCompany = (company) => {
  return {
    PutRequest: {
      Item: {
        id: {
          S: String(company.id),
        },
        title: {
          S: company.title,
        },
        media: {
          L: company.media
            ? company.media.map((media) => ({
                M: {
                  title: {
                    S: media.title,
                  },
                  url: {
                    S: media.url,
                  },
                },
              }))
            : [],
        },
        original_id: {
          S: company.original_id,
        },
      },
    },
  };
};

module.exports.formatCompanyLookup = (company) => {
  const format = (schema, company) => {
    const request = {};
    Object.keys(schema).forEach((key) => {
      const type = schema[key];
      if (company[key]) {
        request[key] = {
          [type]: String(company[key]),
        };
      }
    });
    return {
      PutRequest: {
        Item: request,
      },
    };
  };
  const schema = {
    title: "S",
    lower_title: "S",
    id: "S",
    country: "S",
    nace_code: "S",
    activity_group_name: "S",
    street: "S",
    city: "S",
    postcode: "S",
    lang_address: "S",
    holding_company: "S",
    holdpostal_code: "S",
    holdcountry_code: "S",
    holdaddr_city: "S",
    holdline_addr_1: "S",
    company_main_siren_fra_id: "S",
  };
  return format(schema, company);
};

module.exports.formatPutRequestToCompanyMedia = (request) => {
  const media = request.media.L
    ? request.media.L.map((item) => {
        return {
          title: item.M.title.S,
          url: item.M.url.S,
        };
      })
    : [];
  return media;
};

module.exports.formatPutRequestToCompany = (request) => {
  const media = request.media.L
    ? request.media.L.map((item) => {
        return {
          title: item.M.title.S,
          url: item.M.url.S,
        };
      })
    : [];
  return {
    id: request.id.S,
    title: request.title.S,
    original_id: request.original_id.S,
    media,
  };
};

module.exports.formatCompaniesToGetRequest = (table, companies) => {
  const keys = companies
    .filter((e) => e.id)
    .map((company) => ({
      id: {
        S: company.id,
      },
    }));
  return {
    RequestItems: {
      [table]: {
        Keys: keys,
        ProjectionExpression: "id, media",
      },
    },
  };
};
