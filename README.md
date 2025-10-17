# Introduction

--- UPDATE ---
This repository is deprecated. Please see https://github.com/shafiquejamal/github-pr-visual-code-coverage instead. 


This repo shows code coverage of PRs visually for TypeScript and JavaScript projects. It is an extension that works for Chrome. It works for private repositories - you will need to have a GitHub access token that is able to read your repo and read the GitHub actions artifacts in that repo.

I think this works for public repos also; in this case, you won't need a GitHub token.

## Installation

- Clone this repo
- `cd` into the project root
- run `npm run build`
- In Chrome select Exetensions -> Manage Exetensions (or in the Chrome browser navigation bar go to chrome://extensions/) -> Load Unpacked:

![Screenshot 2025-03-15 at 11 30 50 AM](https://github.com/user-attachments/assets/eb0fd3b8-71ee-48ba-a9e1-d23676f24ddf)

- Select the `dist/` folder in the project (it should have been created by running `npm run build`)

![Screenshot 2025-03-15 at 12 07 03 PM](https://github.com/user-attachments/assets/bcff1151-3734-4276-b5e6-5cd0c22b746e)

## Use

- Navigate to the "Files changed" tab of the PR for repo
- Click on the newly installed browser extension

![Screenshot 2025-03-15 at 12 08 07 PM](https://github.com/user-attachments/assets/8f0c3850-0177-48f5-8b58-01ccaab47ab5)

- Enter your GitHub token

![Screenshot 2025-03-15 at 12 08 17 PM](https://github.com/user-attachments/assets/fc155db1-0454-48d5-b865-445ff747f8e7)

- Click "Save and Reload"

You should now see vertical red and green bars showing coverage. See [this example PR](https://github.com/shafiquejamal/gitub-example-visual-code-coverage-for-pr/pull/1):

![Screenshot 2025-03-15 at 1 01 47 PM](https://github.com/user-attachments/assets/8b40acc9-82d7-40cb-864c-20c0ab6d76ac)

Notice the green and red vertical bars:

![Screenshot 2025-03-15 at 1 02 06 PM](https://github.com/user-attachments/assets/fa6570eb-5c4e-417d-845d-addfcc27b5b0)

and compare those vertical bars with what the test covers. The red matches up with what is not covered, and the green matches up with what is covered.
