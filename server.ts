import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";

import * as express from "express";
import * as serveStatic from "serve-static";
import * as compression from "compression";

const PORT = 3000;

// Set up Express and its middleware
export let app = express();
app.use(compression());

// Load and compile Handlebars templates
let [indexTemplate] = ["index.html"].map(file => {
	let data = fs.readFileSync(path.resolve(__dirname, file), "utf8");
	return Handlebars.compile(data);
});

app.route("/").get((request, response) => {
	response.send(indexTemplate({
		year: new Date().getFullYear().toString()
	}));
});
app.use("/assets", serveStatic(path.resolve(__dirname, "assets")));

app.listen(PORT, () => {
	console.log(`Website started on port ${PORT}`);
});
