# Stray Reporting Module Setup

This note keeps the stray-report work isolated from the rest of the Pet Management System.

## Environment Variables

Backend:

- `PORT=5000`
- `MONGODB_URI=mongodb://...`
- `JWT_SECRET=...`
- `ADMIN_EMAIL=...`
- `ADMIN_PASSWORD=...`

Frontend:

- `REACT_APP_API_URL=http://localhost:5000`

## Docker

The existing `docker-compose.yml` already wires the backend to MongoDB and exposes the frontend through Nginx. For local team development, the current safe flow is:

```bash
docker-compose up --build
```

If the backend is not available on `5000`, the frontend API wrapper falls back to `5001` for network failures only.

## CI/CD Example

The repository now includes a basic GitHub Actions workflow at [/.github/workflows/ci.yml](../.github/workflows/ci.yml) that:

- installs backend dependencies and sanity-checks the stray report module
- installs frontend dependencies and builds the React app

## AWS Deployment Sketch

1. Build the images with your registry credentials.
2. Push backend and frontend images to Amazon ECR.
3. Run the backend on ECS or Elastic Beanstalk with `MONGODB_URI` pointing to Atlas or a managed MongoDB instance.
4. Serve the frontend via Nginx on ECS, S3 + CloudFront, or the existing frontend container.

## Azure Deployment Sketch

1. Push images to Azure Container Registry.
2. Deploy the backend to Azure Container Apps or App Service.
3. Use Azure Database for MongoDB or MongoDB Atlas.
4. Serve the frontend through Azure Static Web Apps or a containerized Nginx service.

## API Endpoints

- `POST /api/stray-reports`
- `GET /api/stray-reports`
- `GET /api/stray-reports/:id`
- `PATCH /api/stray-reports/:id/status`
