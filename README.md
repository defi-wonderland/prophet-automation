[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/defi-wonderland/prophet-automation/blob/main/LICENSE)

# Prophet Automation

This repository contains a set of scripts designed to automate periodical tasks in Prophet, such as finalizing requests and resolving disputes.

# Running

Fill in the the `.env` file, make sure the addresses in the `constants.ts` file are up to date, then run:

```bash
# Looks for requests that can be finalized and creates a Gelato task to finalize them
yarn scripts:finalize-requests

# Creates Gelato tasks to resolve disputes that can be resolved
yarn scripts:resolve-disputes
```

## Contributors

Prophet SDK was built with ❤️ by [Wonderland](https://defi.sucks).

Wonderland is a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized.

[DeFi sucks](https://defi.sucks), but Wonderland is here to make it better.
