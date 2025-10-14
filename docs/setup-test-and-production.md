# Setup Test and Production

## 1. Set up a PostgreSQL database

## 2. Set up Cloudflare R2

## 3. Set up Mailgun

1. Create API keys for sending

   1. `sinister-incorporated-aws-test`
   2. `sinister-incorporated-aws-prod`

## 4. Set up GitHub

1. Create environments
   1. `terraform-test`
   2. `terraform-prod`
2. Create environment secrets
   - `EMAIL_FUNCTION_PARAMETERS`
      - `[{"name":"...","value":"..."}]`
3. Create environment variables
   - `IAM_ROLE`
4. Enable "Allow GitHub Actions to create and approve pull requests" in Settings/Actions/General/Workflow permissions

## 5. Set up AWS

1. Create AWS accounts

   1. `sam-test`
   2. `sam-prod`

2. Prepare AWS CLI

   ```ini
   # ~/.aws/config

   # S.A.M.
   [profile sam-test]
   sso_session = sam-sso
   sso_account_id = 220746603587
   sso_role_name = AdministratorAccess

   [profile sam-prod]
   sso_session = sam-sso
   sso_account_id =
   sso_role_name = AdministratorAccess

   [sso-session sam-sso]
   sso_region = eu-central-1
   sso_start_url = https://simonknittel.awsapps.com/start
   ```

3. Create and deploy setup stack with AWS CloudFormation

   1. Create and populate `test-parameters.json` and `prod-parameters.json`
   1. `AWS_PROFILE=sam-test aws sso login`
   2. `AWS_PROFILE=sam-test aws --region eu-central-1 cloudformation deploy --template-file setup.yaml --stack-name setup --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --tags ManagedBy=CloudFormation Repository=simonknittel/sam --parameter-override file://test-parameters.json`

4. Manually set up AWS User Notifications through the console

   1. Notification hubs: eu-central-1
   2. Create notification configuration for CloudWatch

      1. Name: `cloudwatch-alarms`
      2. AWS service name: `CloudWatch`
      3. Event type: `CloudWatch Alarm State Change`
      4. Regions: eu-central-1
      5. Advanced filter

      ```json
      {
        "detail": {
          "previousState": { "value": ["OK", "INSUFFICIENT_DATA"] },
          "state": { "value": ["ALARM"] }
        }
      }
      ```

      6. Aggregation settings: Receive within 5 minutes
      7. Delivery channels: Email

   3. Create notification configuration for Health

### Related

- https://stackoverflow.com/questions/51273227/whats-the-most-efficient-way-to-determine-the-minimum-aws-permissions-necessary
- https://github.com/iann0036/iamlive
  - `iamlive --mode proxy --force-wildcard-resource --output-file policy.json --sort-alphabetical`
  - `HTTP_PROXY=http://127.0.0.1:10080 HTTPS_PROXY=http://127.0.0.1:10080 AWS_CA_BUNDLE=~/.iamlive/ca.pem AWS_CSM_ENABLED=true AWS_PROFILE=sam-test terraform plan -var-file="test.tfvars"`

## 6. Prepare certificates for Mutual TLS (mTLS)

1. `mkdir certificates && cd certificates/`
2. Create private certificate authority (CA): `openssl genrsa -out RootCA.key 4096`
3. Create private and public keys: `openssl req -new -x509 -days 3650 -key RootCA.key -out RootCA.pem`
   - Country Name: `DE`
   - State or Province Name: `Lower Saxony`
   - Locality Name: `Delmenhorst`
   - Organization Name: `Sinister Incorporated`
   - Organizational Unit Name: `-`
   - Common Name: `sinister-api.simonknittel.de`
   - Email Address: `-`
4. Create client certificate private key and certificate signing request (CSR). Leave _A challenge password_ empty.
   1. `openssl req -newkey rsa:2048 -nodes -keyout localhost.key -out localhost.csr`
   2. `openssl req -newkey rsa:2048 -nodes -keyout vercel.key -out vercel.csr`
5. Sign client certificates with root CA
   1. `openssl x509 -req -in localhost.csr -CA RootCA.pem -CAkey RootCA.key -set_serial 01 -out localhost.pem -days 3650 -sha256`
   2. `openssl x509 -req -in vercel.csr -CA RootCA.pem -CAkey RootCA.key -set_serial 01 -out vercel.pem -days 3650 -sha256`
6. Create trust store: `cp RootCA.pem truststore.pem`

## 7. Set up Terraform

1. Create and populate `test.s3.tfbackend`, `prod.s3.tfbackend`, `test.tfvars` and `prod.tfvars`
2. Create Terraform resources

   1. `AWS_PROFILE=sam-test aws sso login`
   2. `AWS_PROFILE=sam-test terraform init -backend-config=test.s3.tfbackend`
   3. `AWS_PROFILE=sam-test terraform apply -var-file="test.tfvars"`

## 8. Set up Vercel

1. Set `Ignored Build Step` to `Run my Bash script: bash ../.vercel/ignore-step.sh`

## 9. Left over

1. Manually enable we monthly budget report on AWS
   - Budget report name: `Total monthly costs`
   - Select budgets: `Total monthly budget`
   - Report frequency: `Monthly`
   - Day of month: `1`
