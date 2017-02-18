import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
const GitHub = require('github-api');

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
// Set up the GitHub API
let githubToken: string = JSON.parse(fs.readFileSync("secrets.json", "utf8")).github;
let github = new GitHub({
	"username": "petschekr",
	"password": githubToken
});
function delay(milliseconds: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, milliseconds);
    });
}
let statistics = {
	commitsTotal: 0,
	projects: 0,
	publicProjects: 0,
	hash: require("git-rev-sync").short()
};
async function refreshGitHubStats() {
	statistics.commitsTotal = 0;
	statistics.projects = 0;
	let me = github.getUser();
	let profile = await me.getProfile();
	statistics.publicProjects = profile.data.public_repos;
	let {data: repos}: {data: any[]} = await me.listRepos({"type": "all"});
	repos.map(async repoData => {
		let nameParts: string[] = repoData.full_name.split("/");
		let repo = github.getRepo(nameParts[0], nameParts[1]);
		try {
			let commitData: any;
			while (true) {
				commitData = await repo.getContributorStats();
				if (commitData.status !== 202) break;
				// If data has been submitted for processing, wait 1 second and try again
				// https://developer.github.com/v3/repos/statistics
				await delay(1000);
			}
			let myData = (commitData.data as any[]).find(userData => {
				return userData.author.login === "petschekr";
			});
			if (myData) {
				statistics.commitsTotal += myData.total;
				statistics.projects++;
			}
		}
		catch (err) {
			// Repository doesn't allow viewing contributors (RoboJackets)
			console.warn(err.message);
		}
	});
}
// Update at startup and then every 15 minutes
refreshGitHubStats();
setInterval(refreshGitHubStats, 1000 * 60 * 15);

app.route("/").get((request, response) => {
	response.send(indexTemplate({
		year: new Date().getFullYear().toString(),
		statistics: {
			...statistics,
			commitsTotal: statistics.commitsTotal.toLocaleString() // Formats to include commas
		}
	}));
});
app.use("/assets", serveStatic(path.resolve(__dirname, "assets")));

app.listen(PORT, () => {
	console.log(`Website started on port ${PORT}`);
});
