# Healthcare Consultation Assistant (Clerk + Groq)

This project is a full-stack healthcare consultation assistant built from your Day 3-5 flow:

- Next.js (Pages Router) frontend
- Clerk auth
- True subscription sync via Clerk Billing webhooks to `publicMetadata.planKey`
- FastAPI backend
- Groq LLM streaming responses
- Docker + AWS App Runner ready

## 1) Local setup

1. Copy `.env.example` to `.env.local` (frontend) and `.env` (docker/aws values).
2. Fill in real values for Clerk and Groq keys.

Install dependencies:

```bash
npm install
python3 -m pip install -r requirements.txt
```

Run frontend:

```bash
npm run dev
```

Run backend:

```bash
uvicorn api.server:app --reload --port 8000
```

## 2) Subscription gate behavior

The product page allows access when:

- user is signed in, and
- `user.publicMetadata.planKey === "premium_subscription"`

The backend now includes a verified Clerk webhook endpoint:

- `POST /api/webhooks/clerk`
- verifies Svix signature using `CLERK_WEBHOOK_SECRET`
- listens for `subscription.*` events
- updates Clerk user `public_metadata.planKey` using Clerk Backend API

### Clerk dashboard webhook setup

1. In Clerk Dashboard, open **Webhooks** and create endpoint:
   - Local dev: `http://localhost:8000/api/webhooks/clerk`
   - AWS: `https://<your-apprunner-domain>/api/webhooks/clerk`
2. Subscribe to `subscription.created`, `subscription.updated`, `subscription.cancelled` (or all `subscription.*`).
3. Copy signing secret and set `CLERK_WEBHOOK_SECRET`.
4. Ensure your billing plan key in Clerk is exactly `premium_subscription`.

## 3) Groq model config

Set in environment:

- `GROQ_API_KEY`
- optional `GROQ_MODEL` (default: `llama-3.1-8b-instant`)

## 4) Docker / AWS App Runner

Build (Apple Silicon compatible for AWS runtime):

```bash
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -t consultation-app .
```

Run:

```bash
docker run -p 8000:8000 \
  -e CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  -e CLERK_JWKS_URL="$CLERK_JWKS_URL" \
  -e GROQ_API_KEY="$GROQ_API_KEY" \
  -e CLERK_WEBHOOK_SECRET="$CLERK_WEBHOOK_SECRET" \
  consultation-app
```

## 5) Exact AWS ECR + App Runner commands

These commands auto-detect your AWS account and use `us-east-1`.

```bash
# 0) Choose region
export DEFAULT_AWS_REGION=us-east-1

# 1) Confirm AWS identity and capture account id
aws sts get-caller-identity
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
echo "Using account: $AWS_ACCOUNT_ID in region: $DEFAULT_AWS_REGION"

# 2) Ensure ECR repo exists
aws ecr describe-repositories \
  --repository-names consultation-app \
  --region "$DEFAULT_AWS_REGION" >/dev/null 2>&1 || \
aws ecr create-repository \
  --repository-name consultation-app \
  --region "$DEFAULT_AWS_REGION"

# 3) Login Docker to ECR
aws ecr get-login-password --region "$DEFAULT_AWS_REGION" | \
docker login --username AWS --password-stdin \
"$AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com"

# 4) Build image for AWS runtime (important on Apple Silicon)
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -t consultation-app .

# 5) Tag + push to ECR
docker tag consultation-app:latest \
"$AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest"
docker push \
"$AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest"

# 6) Create App Runner ECR access role (one-time)
cat > apprunner-trust-policy.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "build.apprunner.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

aws iam create-role \
  --role-name AppRunnerECRAccessRole \
  --assume-role-policy-document file://apprunner-trust-policy.json >/dev/null 2>&1 || true

aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

# 7) Create App Runner service (first time)
aws apprunner create-service \
  --region "$DEFAULT_AWS_REGION" \
  --service-name consultation-app-service \
  --source-configuration "{
    \"AuthenticationConfiguration\": {\"AccessRoleArn\": \"arn:aws:iam::$AWS_ACCOUNT_ID:role/AppRunnerECRAccessRole\"},
    \"AutoDeploymentsEnabled\": false,
    \"ImageRepository\": {
      \"ImageIdentifier\": \"$AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest\",
      \"ImageRepositoryType\": \"ECR\",
      \"ImageConfiguration\": {
        \"Port\": \"8000\",
        \"RuntimeEnvironmentVariables\": {
          \"CLERK_SECRET_KEY\": \"$CLERK_SECRET_KEY\",
          \"CLERK_JWKS_URL\": \"$CLERK_JWKS_URL\",
          \"CLERK_WEBHOOK_SECRET\": \"$CLERK_WEBHOOK_SECRET\",
          \"GROQ_API_KEY\": \"$GROQ_API_KEY\",
          \"GROQ_MODEL\": \"${GROQ_MODEL:-llama-3.1-8b-instant}\"
        }
      }
    }
  }" \
  --instance-configuration "{
    \"Cpu\": \"0.25 vCPU\",
    \"Memory\": \"0.5 GB\"
  }" \
  --health-check-configuration "{
    \"Protocol\": \"HTTP\",
    \"Path\": \"/health\",
    \"Interval\": 20,
    \"Timeout\": 5,
    \"HealthyThreshold\": 2,
    \"UnhealthyThreshold\": 5
  }"

# 8) For updates later, trigger deploy on existing service
SERVICE_ARN="$(aws apprunner list-services --region "$DEFAULT_AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='consultation-app-service'].ServiceArn" \
  --output text)"
aws apprunner start-deployment --region "$DEFAULT_AWS_REGION" --service-arn "$SERVICE_ARN"
```
