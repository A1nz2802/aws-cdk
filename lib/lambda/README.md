# LABORATORY 18

## Create payload

Create a file named "payload.json" with the following code:

{"key1": "value1", "key2": "value2"}

## Invoke function synchronously

aws lambda invoke --function-name MyLambda --payload ewogICJrZXkxIjogInZhbHVlMSIsCiAgImtleTIiOiAidmFsdWUyIiwKICAia2V5MyI6ICJ2YWx1ZTMiCn0= response.json

aws lambda invoke --function-name MyLambda out

## Invoke function asynchronously

aws lambda invoke --function-name MyLambda --invocation-type Event --payload ewogICJrZXkxIjogInZhbHVlMSIsCiAgImtleTIiOiAidmFsdWUyIiwKICAia2V5MyI6ICJ2YWx1ZTMiCn0= response.json