## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.
## Installation

```bash
$ npm install
```

## Supabase Setup Guide

1. **Set Up Supabase Locally**  
   Follow the instructions in the [Supabase CLI Getting Started Guide](https://supabase.com/docs/guides/cli/getting-started) to set up Supabase on your local machine.

2. **Initialize Database**  
   After the initial setup, run the following command to reset your database:
   `supabase db reset` This command will:
   - Clear any existing database.
   - Create a fresh database from scratch.
   - Apply all migrations to the new database.
3. Access the Supabase Dashboard locally at http://localhost:54323/ and follow these steps
   - Create a new storage bucket named `leo`
   - Set up policies for the bucket to allow the following operations:
     - SELECT 
     - INSERT
     - DELETE
     - UPDATE

> **Note**:
There’s no need to run `supabase init` during the local setup process.


## Environment Variable

For Production Create a `.env` file and in dev environment `.env.development` by duplicating the `.env.example` file. Then, update the variables in the new file with their corresponding values.

## Webhook

To run a webhook locally, you will need to expose your local server to the internet, for that you will use ngrok. 

You can run this command in your terminal `ngrok http --domain=eminently-discrete-slug.ngrok-free.app <port-number>`.

Change your <port-number> to port you are running your backend on.
## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
