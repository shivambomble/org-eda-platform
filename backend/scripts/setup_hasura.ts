import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Use environment variable or fallback to localhost
const HASURA_GRAPHQL_URL = process.env.HASURA_GRAPHQL_URL || 'http://localhost:8081/v1/graphql';
const HASURA_URL = HASURA_GRAPHQL_URL.replace('/v1/graphql', '/v1/metadata');
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'myadminsecretkey';

const tables = [
  'organizations',
  'users',
  'projects',
  'project_members',
  'datasets',
  'cleaning_logs',
  'eda_results',
  'dashboards',
  'dashboard_permissions'
];

const runMetadataQuery = async (query: any) => {
  try {
    const response = await axios.post(HASURA_URL, query, {
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Success: ${query.type}`);
  } catch (error: any) {
    console.error(`Error in ${query.type}:`, error.response?.data || error.message);
  }
};

const main = async () => {
  console.log('Tracking tables...');
  
  // Track all tables
  for (const table of tables) {
    await runMetadataQuery({
      type: 'pg_track_table',
      args: {
        source: 'default',
        schema: 'public',
        name: table
      }
    });
  }

  console.log('Creating Relationships...');

  // User -> Organization
  await runMetadataQuery({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'users',
      name: 'organization',
      using: { foreign_key_constraint_on: 'org_id' }
    }
  });

  // Projects -> Organization
  await runMetadataQuery({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'projects',
      name: 'organization',
      using: { foreign_key_constraint_on: 'org_id' }
    }
  });

  // Projects -> Datasets (Array Rel)
  await runMetadataQuery({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'projects',
      name: 'datasets',
      using: { foreign_key_constraint_on: {
        table: 'datasets',
        column: 'project_id'
      }}
    }
  });

  // Datasets -> Project
  await runMetadataQuery({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'datasets',
      name: 'project',
      using: { foreign_key_constraint_on: 'project_id' }
    }
  });

  // EDA Results -> Dataset
  await runMetadataQuery({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'eda_results',
      name: 'dataset',
      using: { foreign_key_constraint_on: 'dataset_id' }
    }
  });

  // Dataset -> EDA Results (Array Rel)
  await runMetadataQuery({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'datasets',
      name: 'eda_results',
      using: { foreign_key_constraint_on: {
        table: 'eda_results',
        column: 'dataset_id'
      }}
    }
  });

  // Dashboards -> Project
  await runMetadataQuery({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'dashboards',
      name: 'project',
      using: { foreign_key_constraint_on: 'project_id' }
    }
  });

  // Projects -> Dashboards (Array Rel)
  await runMetadataQuery({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'projects',
      name: 'dashboards',
      using: { foreign_key_constraint_on: {
        table: 'dashboards',
        column: 'project_id'
      }}
    }
  });

  // Dashboard -> Permissions
  await runMetadataQuery({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'dashboards',
      name: 'permissions',
      using: { foreign_key_constraint_on: {
        table: 'dashboard_permissions',
        column: 'dashboard_id'
      }}
    }
  });

  console.log('Setting RLS Policies...');

  // 1. ADMIN: Access everything in their org
  // Users table
  await runMetadataQuery({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: 'users',
      role: 'admin',
      permission: {
        columns: '*',
        filter: {
          org_id: { _eq: 'X-Hasura-Org-Id' }
        }
      }
    }
  });

  // 2. USER: Access themselves
  await runMetadataQuery({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: 'users',
      role: 'user',
      permission: {
        columns: '*',
        filter: {
          id: { _eq: 'X-Hasura-User-Id' }
        }
      }
    }
  });
  
  // 3. ANALYST: Access assigned Projects
  await runMetadataQuery({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'projects',
      name: 'members',
      using: { foreign_key_constraint_on: {
        table: 'project_members',
        column: 'project_id'
      }}
    }
  });

  await runMetadataQuery({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: 'projects',
      role: 'analyst',
    permission: {
        columns: '*',
        filter: {
          members: {
            user_id: { _eq: 'X-Hasura-User-Id' }
          }
        },
        allow_aggregations: true
      }
    }
  });

  // Analyst Datasets View
  await runMetadataQuery({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: 'datasets',
      role: 'analyst',
      permission: {
        columns: '*',
        filter: {
            project: {
                members: {
                    user_id: { _eq: 'X-Hasura-User-Id' }
                }
            }
        },
        allow_aggregations: true
      }
    }
  });

  // Analyst EDA Results View
  await runMetadataQuery({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: 'eda_results',
      role: 'analyst',
      permission: {
        columns: '*',
        filter: {
            dataset: {
                project: {
                    members: {
                        user_id: { _eq: 'X-Hasura-User-Id' }
                    }
                }
            }
        },
        allow_aggregations: true
      }
    }
  });

  // Admin permissions for all tables
  console.log('Setting Admin Permissions...');
  
  const adminTables = ['organizations', 'projects', 'datasets', 'eda_results', 'cleaning_logs', 'dashboards', 'dashboard_permissions', 'project_members'];
  
  for (const table of adminTables) {
    await runMetadataQuery({
      type: 'pg_create_select_permission',
      args: {
        source: 'default',
        table,
        role: 'admin',
        permission: {
          columns: '*',
          filter: {}  // Admin has access to everything
        }
      }
    });
  }

  console.log('Hasura Metadata Configuration Complete.');
};

main();
