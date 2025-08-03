# AWS CDK TypeScript Playground

This repository serves as a development and learning environment for creating AWS infrastructure using the [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) with TypeScript. It contains a series of practical labs and examples that demonstrate how to provision different AWS resources.

## Prerequisites

*   AWS credentials configured in an `.env` file in the project root. You can use the following template:

    ```bash
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    
    CDK_DEFAULT_ACCOUNT=
    CDK_DEFAULT_REGION=
    ```

## Installation and Setup

1.  **Create your `.env` file** with your AWS credentials as described in the "Prerequisites" section.

2.  **Start the Docker container:**
    ```bash
    docker-compose up -d
    ```
3. **Boostrap your environment** 
    ```
    pnpm run bootstrap
    ```

    This command is crucial for preparing your AWS account for CDK deployments. It configures necessary permissions, roles, and creates essential resources that the CDK requires. This step is typically a one-time setup per AWS account/region.

## Useful Commands

All the following commands are executed inside the Docker container. You can access the container with `docker exec -it aws bash`.

*   `pnpm install`: Installs or re-installs project dependencies.
*   `pnpm run watch`: Watches for file changes and automatically re-runs the CDK app.
*   `pnpm run bootstrap`: Bootstraps the AWS environment for CDK deployment.
*   `pnpm run synth`: Synthesizes the CloudFormation template.
*   `pnpm run synthy`: Synthesizes the CloudFormation template and saves it to `cdk.out/lab.yaml`, ensuring read permissions for everyone.
*   `pnpm run deploy`: Deploys the current stack to AWS.
*   `pnpm run destroy`: Destroys the current stack from AWS.
*   `pnpm run cdk -- <subcommand>`: Executes other CDK commands (e.g., list to list stacks, docs to view documentation).

Use this commands in the host.
*   `pnpm run format`: Formats the code using Prettier.
*   `pnpm run lint`: Lints the code with ESLint to identify issues.

## Available Labs

This project includes the following labs, organized by AWS service:

*   **VPC:**
    *   `lab1.ts`: Create a basic VPC.
    *   `lab2.ts`: Create a VPC with public and private subnets.
*   **EC2:**
    *   `lab3.ts` - `lab8.ts`: Various examples of creating and configuring EC2 instances.
*   **S3:**
    *   `lab9.ts` - `lab14.ts`: Examples of creating buckets, policies, event notifications, etc.
*   **CloudFormation:**
    *   `lab15.ts` - `lab16.ts`: Examples of how to use CloudFormation constructs.
*   **Beanstalk:**
    *   `lab17.ts`: Example of how to deploy an application with Elastic Beanstalk.
*   **Lambda:**
    *   `lab18.ts` - `lab22.ts`: Create and configure Lambda functions.
*   **DynamoDB:**
    *   `lab23.ts`: Example of creating a DynamoDB table.

## Project Structure

*   `bin/hello-cdk.ts`: The entry point for the CDK application.
*   `lib/`: Contains the CDK stack definitions.
    *   `lib/stack-map.ts`: A map that associates lab names with their respective stacks.
    *   `lib/<service>/`: Each AWS service has its own directory with the corresponding labs.
*   `cdk.json`: Configuration file for the CDK.
*   `yaml-examples`: This directory serves as a repository for synthesized CloudFormation templates.

## How to Execute or Switch Labs

To test a specific lab, all you need to di is modify the value of `LAB_NUMBER` in the `lib/stack-map.ts` file.

Open `lib/stack-map.ts` and find the line:

```ts
const LAB_NUMBER = 23; // Or whatever the current number is
```

Change 23 to the number of the lab you want to run. For example, if you want to test lab number 15, the line should look like this:

```ts
const LAB_NUMBER = 15;
```

Then, run these commands:

```bash
pnpm run synth
pnpm run deploy
```

That's it! The CDK will process the specified lab and deploy it to your AWS environment.

When you're finished, you can destroy your AWS resources with:

```bash
pnpm run destroy
```