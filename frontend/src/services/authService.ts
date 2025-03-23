// src/services/authService.ts
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

interface CognitoConfig {
  UserPoolId: string;
  ClientId: string;
}

const cognitoConfig: CognitoConfig = {
  UserPoolId: process.env.REACT_APP_USER_POOL_ID || '',
  ClientId: process.env.REACT_APP_CLIENT_ID || '',
};

const userPool = new CognitoUserPool(cognitoConfig);

export interface UserAttributes {
  [key: string]: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export const signUp = (email: string, password: string): Promise<CognitoUser> => {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
    ];
    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      if (result?.user) {
        resolve(result.user);
      } else {
        reject(new Error('User was not created'));
      }
    });
  });
};

export const confirmSignUp = (email: string, code: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

export const signIn = (email: string, password: string): Promise<UserAttributes> => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result: CognitoUserSession) => {
        // Get user attributes after successful login
        cognitoUser.getUserAttributes((err, attributes) => {
          if (err) {
            console.error('Error getting user attributes:', err);
            reject(err);
            return;
          }
          // Convert array of attributes to an object
          const userAttributes: UserAttributes = {};
          if (attributes) {
            attributes.forEach((attr) => {
              userAttributes[attr.getName()] = attr.getValue();
            });
          }
          // Store tokens in localStorage
          localStorage.setItem('accessToken', result.getAccessToken().getJwtToken());
          localStorage.setItem('idToken', result.getIdToken().getJwtToken());
          resolve(userAttributes);
        });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const signOut = (): void => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
    localStorage.removeItem('accessToken');
  }
};

export const getCurrentUser = (): Promise<UserAttributes> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user found'));
      return;
    }

    cognitoUser.getSession((err: Error | null, _session: CognitoUserSession) => {
      if (err) {
        reject(err);
        return;
      }

      // Use the proper callback type
      cognitoUser.getUserAttributes(
        (err: Error | undefined, attributes?: CognitoUserAttribute[]) => {
          if (err) {
            reject(err);
            return;
          }

          if (!attributes) {
            resolve({});
            return;
          }

          const userData = attributes.reduce((acc, attribute) => {
            acc[attribute.getName()] = attribute.getValue();
            return acc;
          }, {} as UserAttributes);

          resolve(userData);
        }
      );
    });
  });
};

export interface ForgotPasswordResult {
  CodeDeliveryDetails?: {
    AttributeName: string;
    DeliveryMedium: string;
    Destination: string;
  };
}

export const forgotPasswordRes = (email: string): Promise<ForgotPasswordResult> => {
  return new Promise((resolve, reject) => {
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.forgotPassword({
      onSuccess: (data) => {
        resolve(data as ForgotPasswordResult);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const confirmForgotPassword = (
  email: string,
  code: string,
  newPassword: string
): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve({ success: true, message: 'Password successfully reset' });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const changePassword = (oldPassword: string, newPassword: string): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user found'));
      return;
    }

    cognitoUser.getSession((err: Error | null, _session: CognitoUserSession) => {
      if (err) {
        reject(err);
        return;
      }

      cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, message: result });
      });
    });
  });
};

export const updateUserAttributes = (attributes: {
  [key: string]: string;
}): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user found'));
      return;
    }

    cognitoUser.getSession((err: Error | null, _session: CognitoUserSession) => {
      if (err) {
        reject(err);
        return;
      }

      const attributeList = Object.entries(attributes).map(
        ([key, value]) => new CognitoUserAttribute({ Name: key, Value: value })
      );

      cognitoUser.updateAttributes(attributeList, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, message: result });
      });
    });
  });
};

export const deleteUser = (): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No user found'));
      return;
    }

    cognitoUser.getSession((err: Error | null, _session: CognitoUserSession) => {
      if (err) {
        reject(err);
        return;
      }

      cognitoUser.deleteUser((err, result) => {
        if (err) {
          reject(err);
          return;
        }
        localStorage.removeItem('accessToken');
        resolve({ success: true, message: result });
      });
    });
  });
};
