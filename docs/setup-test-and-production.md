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
2. Create environment variables
   - `IAM_ROLE`
3. Enable "Allow GitHub Actions to create and approve pull requests" in Settings/Actions/General/Workflow permissions

## 5. Set up AWS

1. Create AWS accounts

   1. `sam-test`
   2. `sam-prod`

2. Prepare AWS CLI

   ```ini
   # ~/.aws/config

   # SAM
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

## 6. Set up Terraform

1. Create and populate `test.s3.tfbackend`, `prod.s3.tfbackend`, `test.tfvars` and `prod.tfvars`
2. Create Terraform resources

   1. `AWS_PROFILE=sam-test aws sso login`
   2. `AWS_PROFILE=sam-test terraform init -backend-config=test.s3.tfbackend`
   3. `AWS_PROFILE=sam-test terraform apply -var-file="test.tfvars"`

## 7. Set up Vercel

1. Set `Ignored Build Step` to `Run my Bash script: bash ../.vercel/ignore-step.sh`

## 8. Left over

1. Manually enable we monthly budget report on AWS
   - Budget report name: `Total monthly costs`
   - Select budgets: `Total monthly budget`
   - Report frequency: `Monthly`
   - Day of month: `1`
