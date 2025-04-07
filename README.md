# leo-backend

Backend service for Leo, built with NestJS and deployed on Railway.

## Environment setup

The project uses different environment files for different environments:

- `.env.local` - For local development
- `.env.development` - For dev environment
- `.env.production` - For production environment

Copy `.env.example` to create your own environment file:

```bash
cp .env.example .env.local
```

Configure the required variables in your environment file.

## Local development

### Running locally with Docker

To run the application in a local Docker container:

```bash
make docker-local
```

For a clean build (rebuilding from scratch):

```bash
make docker-local-clean
```

The app will be available at http://localhost:4000.

## Deployment

### Development environment

Deploy to the development environment by pushing to the `dev` branch:

```bash
git push origin dev
```

The CI/CD pipeline will automatically deploy the changes to the dev environment on Railway.

### Production environment

Deploy to production by pushing to the `prod` branch:

```bash
git push origin prod
```

The CI/CD pipeline will automatically deploy the changes to the production environment on Railway.

## Other Docker commands

```bash
# Run the development environment in Docker
make docker-dev

# Run the production environment in Docker
make docker-prod

# Clean build for development environment
make docker-dev-clean

# Clean build for production environment
make docker-prod-clean

# Stop all Docker containers
make docker-stop
```

## Technology stack

- **Framework**: NestJS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Deployment**: Railway
- **Monitoring**: Sentry
- **Payment Processing**: Stripe
- **Queue Management**: Bull

## Testing

```bash
# Run tests
npm test

# Run e2e tests
npm run test:e2e
```

## Useful Links

- Railway Dashboard: [https://railway.app/](https://railway.app/)
- Supabase Dashboard: [https://app.supabase.com/](https://app.supabase.com/)
- Sentry Dashboard: [https://sentry.io/](https://sentry.io/)
