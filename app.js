const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.use("/", require("./modules/oauth/routes/routes"));
app.use("/", require("./modules/customer/routes/customerRoutes"));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
