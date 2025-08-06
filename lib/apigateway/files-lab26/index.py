import json
import boto3

dynamo = boto3.client('dynamodb')

def lambda_handler(event, context):

    operation = event.get('operation')

    # Ensure TableName is included in payload
    if 'tableName' in event:
        event['payload']['TableName'] = event['tableName']

    try:
        if operation == 'create':
            event['payload']['Item'] = format_item(event['payload']['Item'])
            dynamo.put_item(**event['payload'])
            key = {k: v for k, v in event['payload']['Item'].items() if 'id' in k.lower()}
            response = dynamo.get_item(TableName=event['payload']['TableName'], Key=key)
        elif operation == 'read':
            event['payload']['Key'] = format_item(event['payload']['Key'])
            response = dynamo.get_item(**event['payload'])
        elif operation == 'update':
            event['payload']['Key'] = format_item(event['payload']['Key'])
            event['payload']['AttributeUpdates'] = format_updates(event['payload']['AttributeUpdates'])
            response = dynamo.update_item(**event['payload'])
        elif operation == 'delete':
            event['payload']['Key'] = format_item(event['payload']['Key'])
            response = dynamo.delete_item(**event['payload'])
        elif operation == 'list':
            response = dynamo.scan(**event['payload'])
        elif operation == 'echo':
            response = "Success"
        elif operation == 'ping':
            response = "pong"
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(response)
        }
    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(e)})
        }

def format_item(raw_item):

    formatted_item = {}
    for key, value in raw_item.items():
        if isinstance(value, str):
            formatted_item[key] = {"S": value}
        elif isinstance(value, int) or isinstance(value, float):
            formatted_item[key] = {"N": str(value)}
        elif isinstance(value, list):
            formatted_item[key] = {"L": [format_item(item) if isinstance(item, dict) else item for item in value]}
        elif isinstance(value, dict):
            formatted_item[key] = {"M": format_item(value)}
        else:
            raise ValueError(f"Unsupported type for key {key}: {type(value)}")
    return formatted_item

def format_updates(raw_updates):
    
    formatted_updates = {}
    for key, value in raw_updates.items():
        action = value.get("Action", "PUT")  # Default action is PUT
        formatted_value = format_item({key: value["Value"]})[key]
        formatted_updates[key] = {
            "Value": formatted_value,
            "Action": action
        }
    return formatted_updates