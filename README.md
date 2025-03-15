# Introduction

This repo shows code coverage of PRs visually for TypeScript and JavaScript projects. It is an extension that works for Chrome. It works for private repositories - you will need to have a GitHub access token that is able to read your repo and read the GitHub actions artifacts in that repo.

I will try to get this working for public repos.

## Installation

- Clone this repo
- `cd` into the project root
- run `npm run build`
- In Chrome select Exetensions -> Manage Exetensions (or in the Chrome browser navigation bar go to chrome://extensions/) -> Load Unpacked
- Select the `dist/` folder in the project (it should have been created by running `npm run build`)

## Use

- Navigate to the "Files" tab of the PR for repo
- Click on the newly installed browser extension
- Enter your GitHub token
- Click "Save and Reload"

You should now see vertical red and green bars showing coverage.

