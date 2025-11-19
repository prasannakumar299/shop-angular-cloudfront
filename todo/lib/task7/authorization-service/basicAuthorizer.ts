interface AuthorizerEvent {
  authorizationToken?: string;
  methodArn: string;
  [key: string]: string | undefined;
}

export const handler = async (
  event: AuthorizerEvent,
): Promise<AuthResponse> => {
  console.log('Event:', event);

  if (!event.authorizationToken) {
    throw new Error('Unauthorized'); // API Gateway converts to 401
  }

  const token = event.authorizationToken.replace('Basic ', '');
  const decoded = Buffer.from(token, 'base64').toString('utf-8');

  const [username, password] = decoded.split(':');

  const validPwd = process.env[username];

  const effect = validPwd === password ? 'Allow' : 'Deny';

  const response: AuthResponse = {
    principalId: username,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: event.methodArn,
        },
      ],
    },
    context: {
      statusCode: validPwd ? 200 : 403, // optional context
    },
  };

  return response;
};

interface AuthResponse {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: string;
      Resource: string;
    }>;
  };
  context?: {
    [key: string]: string | number | boolean;
  };
}
