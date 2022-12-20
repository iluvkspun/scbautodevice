const request = require("request");
const express = require("express");
const cors = require("cors");
const ame2ee = require("./ame2ee");
const app = express();
const port = 3030;
///
const API_SERVICE_URL = "https://fasteasy.scbeasy.com";
const msisdnUrl = "http://info-msisdn.scb.co.th:8080/msisdn";
const scbVersion = "3.59.0/6231";
const headers = {
  "Accept-Language": "th",
  "scb-channel": "APP",
  "User-Agent": `Android/10;FastEasy/${scbVersion}`,
  "Content-Type": "application/json; charset=utf-8",
  Hos: "fasteasy.scbeasy.com:8443",
  Connection: "close",
  "Max-Forwards": "10",
};
const headersLogin = {
  "Accept-Language": "th",
  "scb-channel": "APP",
  "User-Agent": `Android/10;FastEasy/${scbVersion}`,
  "Content-Type": "application/json; charset=utf-8",
  Hos: "fasteasy.scbeasy.com:8443",
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
};
const headersMsisdn = {
  Accept: "*/*",
  "Accept-Language": "th",
  "scb-channel": "APP",
  "User-Agent": `Android/10;FastEasy/${scbVersion}`,
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json",
  "Cache-Control": "max-age=0, no-cache",
};
const regex = /([^,]+),([^,]+)/;
let m;
var e2Module;
var e2RsaExponent;

//app.use(cors()); // allow cors
app.use(cors());

app.use(express.static("public"));

// Configuring body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.get("/tag/encrypt", (req, res) => {
  const { q: msisdn } = req.query;
  if (!msisdn) return res.status(200).json({ status: "ok" });
  (async () => {
    res.status(200).json({ tag: tagEncrypt(msisdn) });
  })();
});
app.post("/tag/encrypt", (req, res) => {
  const { msisdn } = req.body;
  if (!msisdn) return res.status(400).send("error");
  console.log('msisdn', msisdn );
  (async () => {
    res.status(200).json({ tag: tagEncrypt(msisdn) });
  })();
});
app.get("/pin/encrypt", (req, res) => res.json({ status: "ok" }));
app.post("/pin/encrypt", (req, res) => {
  const data = req.body;

  //    console.log(data);

  if ((m = regex.exec(data.pubKey)) !== null) {
    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (match !== "undefined" && groupIndex == 1) {
        e2Module = match;
      }
      if (match !== "undefined" && groupIndex == 2) {
        e2RsaExponent = match;
      }
    });
  }

  (async () => {
    res
      .status(200)
      .send(
        pinEncrypt(
          data.Sid,
          data.ServerRandom,
          e2Module,
          e2RsaExponent,
          data.pin,
          data.hashType
        )
      );
  })();
});

app.get("/msisdn", (req, res) => {
  request({
    method: "GET",
    url: msisdnUrl,
    headers: getHeaders(req),
  }).on("response", (response) => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
});

app
  .route(["/v1/*", "/v2/*", "/v3/*", "/isprint/soap/preAuth"])
  .get((req, res) => {
    console.log("GET:", req.originalUrl, new Date());
    let url = API_SERVICE_URL + req.originalUrl;
    try {
      request({
        method: "GET",
        url: url,
        headers: getHeaders(req),
      }).on("response", (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
    } catch (e) {
      res.status(404).json({ err: e.message });
    }
  })
  .delete((req, res) => {
    console.log("DELETE:", req.originalUrl, new Date());
    let url = API_SERVICE_URL + req.originalUrl;
    try {
      request({
        method: "DELETE",
        url: url,
        headers: getHeaders(req),
        json: req.body,
      }).on("response", (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
    } catch (e) {
      res.status(404).json({ err: e.message });
    }
  })
  .post((req, res) => {
    console.log("POST:", req.originalUrl, new Date());
    let url = API_SERVICE_URL + req.originalUrl;
    try {
      request({
        method: "POST",
        url: url,
        headers: getHeaders(req),
        json: req.body,
      }).on("response", (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
    } catch (e) {
      res.status(404).json({ err: e.message });
    }
  });

app.listen(port, () =>
  console.log(`EncryptPin app listening on port ${port}!`)
);

function pinEncrypt(Sid, ServerRandom, e2Module, e2RsaExponent, pin, hashType) {
  return ame2ee.encryptPinForAM(
    Sid,
    e2Module + "," + e2RsaExponent,
    ServerRandom,
    pin,
    hashType
  );
}

function tagEncrypt(Tag) {
  return ame2ee.encryptTag(Tag);
}

function getHeaders(req) {
  let login = [
    "/v1/fasteasy-login",
    "/v1/profiles/devices/inquiry",
    "/v1/profiles/device/modelinfo",
    "/v1/profiles/multiDevices",
    "/v3/profiles/devices",
  ];
  delete req.headers.host;
  for (let l of login) {
    if (req.originalUrl.indexOf(l) >= 0) {
      return Object.assign(req.headers, headersLogin);
    }
  }
  if (req.originalUrl.includes("msisdn")) {
    const { "x-msisdn": msisdn } = req.headers;
    return Object.assign({ "x-msisdn": msisdn }, headersMsisdn);
  }
  return Object.assign(req.headers, headers);
}
