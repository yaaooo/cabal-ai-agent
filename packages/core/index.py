def handler(event, context):
    print("VEGA online.")
    return {
        'statusCode': 200,
        'body': 'VEGA core activated.'
    }