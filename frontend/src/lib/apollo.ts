import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { jwtDecode } from 'jwt-decode';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_HASURA_URL || 'http://localhost:8081/v1/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  
  let hasuraHeaders: Record<string, string> = {};
  
  if (token) {
    try {
      // Decode JWT to extract Hasura claims
      const decoded: any = jwtDecode(token);
      const claims = decoded['https://hasura.io/jwt/claims'];
      
      if (claims) {
        hasuraHeaders = {
          'X-Hasura-User-Id': claims['x-hasura-user-id'] || '',
          'X-Hasura-Org-Id': claims['x-hasura-org-id'] || '',
          'X-Hasura-Role': claims['x-hasura-default-role'] || 'user',
        };
        console.log('Hasura Headers:', hasuraHeaders);
      }
    } catch (error) {
      console.error('Failed to decode JWT:', error);
    }
  }
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      ...hasuraHeaders,
    }
  }
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          projects: {
            merge(existing, incoming) {
              return incoming;
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  }
});
