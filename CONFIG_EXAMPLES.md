# Configuration Examples

This document provides example configurations for different types of APIs.

## Example 1: RESTful API

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000",
    "endpoints": [
      {
        "name": "Get All Users",
        "method": "GET",
        "path": "/api/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Get User by ID",
        "method": "GET",
        "path": "/api/users/1",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 300
        }
      },
      {
        "name": "Create User",
        "method": "POST",
        "path": "/api/users",
        "expectedStatus": 201,
        "payload": {
          "name": "John Doe",
          "email": "john@example.com",
          "age": 30
        },
        "thresholds": {
          "duration": 800
        }
      },
      {
        "name": "Update User",
        "method": "PUT",
        "path": "/api/users/1",
        "expectedStatus": 200,
        "payload": {
          "name": "Jane Doe",
          "email": "jane@example.com",
          "age": 25
        },
        "thresholds": {
          "duration": 600
        }
      },
      {
        "name": "Delete User",
        "method": "DELETE",
        "path": "/api/users/1",
        "expectedStatus": 204,
        "thresholds": {
          "duration": 300
        }
      }
    ]
  },
  "staging": {
    "baseUrl": "https://staging-api.example.com",
    "endpoints": [
      {
        "name": "Get All Users",
        "method": "GET",
        "path": "/api/v1/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 1000
        }
      }
    ]
  },
  "production": {
    "baseUrl": "https://api.example.com",
    "endpoints": [
      {
        "name": "Get All Users",
        "method": "GET",
        "path": "/api/v1/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500
        }
      }
    ]
  }
}
```

## Example 2: E-Commerce API

```json
{
  "dev": {
    "baseUrl": "http://localhost:5000",
    "endpoints": [
      {
        "name": "Get Products",
        "method": "GET",
        "path": "/products",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 600
        }
      },
      {
        "name": "Get Product Details",
        "method": "GET",
        "path": "/products/123",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 400
        }
      },
      {
        "name": "Add to Cart",
        "method": "POST",
        "path": "/cart/items",
        "expectedStatus": 201,
        "payload": {
          "productId": 123,
          "quantity": 2
        },
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Create Order",
        "method": "POST",
        "path": "/orders",
        "expectedStatus": 201,
        "payload": {
          "items": [
            {
              "productId": 123,
              "quantity": 2
            }
          ],
          "shippingAddress": "123 Main St",
          "paymentMethod": "credit_card"
        },
        "thresholds": {
          "duration": 1200
        }
      },
      {
        "name": "Get Order Status",
        "method": "GET",
        "path": "/orders/456",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 300
        }
      }
    ]
  },
  "staging": {
    "baseUrl": "https://staging.shop.example.com",
    "endpoints": [
      {
        "name": "Get Products",
        "method": "GET",
        "path": "/api/products",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 1000
        }
      }
    ]
  },
  "production": {
    "baseUrl": "https://shop.example.com",
    "endpoints": [
      {
        "name": "Get Products",
        "method": "GET",
        "path": "/api/products",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 800
        }
      }
    ]
  }
}
```

## Example 3: User Management API with Multiple Versions

```json
{
  "dev": {
    "baseUrl": "http://localhost:8080",
    "endpoints": [
      {
        "name": "Health Check",
        "method": "GET",
        "path": "/health",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 100
        }
      },
      {
        "name": "Get API Version",
        "method": "GET",
        "path": "/version",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 50
        }
      },
      {
        "name": "List Users V1",
        "method": "GET",
        "path": "/v1/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 600
        }
      },
      {
        "name": "List Users V2",
        "method": "GET",
        "path": "/v2/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Create User",
        "method": "POST",
        "path": "/v2/users",
        "expectedStatus": 201,
        "payload": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "role": "user"
        },
        "thresholds": {
          "duration": 700
        }
      },
      {
        "name": "Bulk Create Users",
        "method": "POST",
        "path": "/v2/users/bulk",
        "expectedStatus": 201,
        "payload": [
          {
            "firstName": "User1",
            "lastName": "Test",
            "email": "user1@example.com"
          },
          {
            "firstName": "User2",
            "lastName": "Test",
            "email": "user2@example.com"
          }
        ],
        "thresholds": {
          "duration": 1500
        }
      },
      {
        "name": "Update User",
        "method": "PATCH",
        "path": "/v2/users/100",
        "expectedStatus": 200,
        "payload": {
          "email": "newemail@example.com"
        },
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Delete User",
        "method": "DELETE",
        "path": "/v2/users/100",
        "expectedStatus": 204,
        "thresholds": {
          "duration": 300
        }
      }
    ]
  },
  "staging": {
    "baseUrl": "https://staging-users.example.com",
    "endpoints": [
      {
        "name": "Health Check",
        "method": "GET",
        "path": "/health",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 200
        }
      },
      {
        "name": "List Users",
        "method": "GET",
        "path": "/v2/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 800
        }
      }
    ]
  },
  "production": {
    "baseUrl": "https://users-api.example.com",
    "endpoints": [
      {
        "name": "Health Check",
        "method": "GET",
        "path": "/health",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 200
        }
      },
      {
        "name": "List Users",
        "method": "GET",
        "path": "/v2/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 1000
        }
      }
    ]
  }
}
```

## Example 4: Search API

```json
{
  "dev": {
    "baseUrl": "http://localhost:9200",
    "endpoints": [
      {
        "name": "Cluster Health",
        "method": "GET",
        "path": "/_cluster/health",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 300
        }
      },
      {
        "name": "Search Posts",
        "method": "GET",
        "path": "/posts/_search?q=test",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 1000
        }
      },
      {
        "name": "Search Users",
        "method": "GET",
        "path": "/users/_search?q=john",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 800
        }
      },
      {
        "name": "Index Document",
        "method": "POST",
        "path": "/posts/_doc",
        "expectedStatus": 201,
        "payload": {
          "title": "Test Post",
          "content": "This is a test post",
          "author": "John",
          "timestamp": 1234567890
        },
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Search with Filter",
        "method": "POST",
        "path": "/posts/_search",
        "expectedStatus": 200,
        "payload": {
          "query": {
            "match": {
              "title": "test"
            }
          }
        },
        "thresholds": {
          "duration": 1200
        }
      }
    ]
  },
  "production": {
    "baseUrl": "https://search.example.com",
    "endpoints": [
      {
        "name": "Cluster Health",
        "method": "GET",
        "path": "/_cluster/health",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Search Posts",
        "method": "GET",
        "path": "/posts/_search?q=test",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 1500
        }
      }
    ]
  }
}
```

## Usage Examples

### Run Test with Specific Configuration

```bash
# Copy one of the examples to your config
cp config/endpoints.json config/endpoints.json.backup
# Edit and customize as needed

# Run test against development
k6 run -e ENVIRONMENT=dev tests/api.js

# Run with custom users and duration
k6 run -e ENVIRONMENT=staging -e VIRTUAL_USERS=20 -e DURATION=120s tests/api.js
```

## Tips for Customization

1. **Match Your API Structure**
   - Update `path` to match your API endpoints
   - Set correct `method` (GET, POST, PUT, DELETE, PATCH)
   - Set appropriate `expectedStatus` codes

2. **Realistic Payloads**
   - Use actual data structures from your API
   - Include all required fields
   - Test with valid and edge-case data

3. **Performance Thresholds**
   - Set realistic duration thresholds for each endpoint
   - Consider network latency
   - Use stricter thresholds for production

4. **Environment-Specific URLs**
   - Keep base URLs separate for each environment
   - Use environment names consistently
   - Update paths if they differ by environment version

5. **Test Data Strategy**
   - Use realistic IDs (replace `1`, `123` with actual test data)
   - Consider cleanup after tests
   - Use idempotent operations where possible
