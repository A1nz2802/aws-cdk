import json
import os
import boto3
from base64 import b64decode

def handler(event, context):
  DB_HOST = os.environ["DB_HOST"]
  DB_USER = os.environ["DB_USER"]
  DB_PASS = os.environ['DB_PASS']

  kms = boto3.client('kms')

  DECRYPTED = kms.decrypt(
    CiphertextBlob=b64decode(DB_PASS),
    EncryptionContext={'LambdaFunctionName': os.environ['AWS_LAMBDA_FUNCTION_NAME']}
  )['Plaintext'].decode('utf-8')

  print("Connected to %s as %s with %s" % (DB_HOST, DB_USER, DB_PASS))
  print("*******************************************")
  print(DECRYPTED)

  return {
    'statusCode': 200,
    'body': json.dumps('Hello from Lambda :)')
  }