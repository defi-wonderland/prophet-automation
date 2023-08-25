# Optimistic Oracle SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/defi-wonderland/opoo-sdk/blob/main/LICENSE)

⚠️ The code is under development, tread with caution.

## Overview

Lightweight and user-friendly wrapper around OpOO contracts. The SDK will be a wrapper for blockchain calls, and will support all of the shared interfaces mirroring all of the oracle’s and the modules’ functions in the **[Smart Contracts](https://github.com/defi-wonderland/opoo-core/blob/main/solidity/contracts)**.

The SDK will also support adding custom modules so that any developer can create and use modules specific to their use case.

## Setup

To build it locally, run:

```sh
git clone git@github.com:defi-wonderland/opoo-sdk.git
cd
yarn install
yarn build
```

## Installation

You can install the sdk via yarn:

```sh
yarn add opoo-sdk
```

## Structure

```
~~ Structure ~~
├── examples: Simple examples that use the sdk
├── docs: Documentation for the sdk
├── src: The sdk scripts and logic
│   ├─── types/: All the contract types and defined types
│   │    ├─── Oracle: The oracle class
│   │    ├─── Module: The general module class
│   │    ├─── X_Modules: The rest of the modules as interfaces
│   │    └───  ...
│   ├─── utils/: General util functions we will need
│   │    ├─── batching: Util responsible to batch calls
│   │    ├─── chain constants: Addresses and general constants
│   │    └─── other utils like handling pinata etc
│   ├─── provider.ts: Handles different providers and networks
│   ├─── Oracle.ts: The main logic of the oracle sdk
|   └─── ...
├── tests: Tests for the sdk
│   ├─── helpers/: Helpers needed for the tests
│   └─── ...
├── README.md
```

## Contributors

Optimistic Oracle SDK was built with ❤️ by [Wonderland](https://defi.sucks).

Wonderland is a team of top Web3 researchers, developers, and operators who believe that the future needs to be open-source, permissionless, and decentralized.

[DeFi sucks](https://defi.sucks), but Wonderland is here to make it better.
