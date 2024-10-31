# xAPI-Server-Essentials

xAPI-Server-Essentials is a lightweight, xAPI server designed to handle xAPI statements and state data for eLearning platforms such as Adapt Learning’s xAPI plugin. The project provides similar functionality to Learning Locker but with added security constraints. These constraints prevent clients from accessing personal data or statements, protecting against potential misuse of client keys to obtain sensitive information.

The server is written in Node.js with Express, MongoDB for persistence, and Mongoose for data modeling.

## Key Features

- **xAPI Statement Support**: Handles xAPI statement submissions but restricts clients from retrieving statements, ensuring that no personal data can be accessed via API calls.
- **xAPI State Management**: Provides endpoints to store and retrieve the state data for a particular learning activity or agent.
- **Client-Level Permissions**: Hardcoded limitations on what operations a client can perform. Clients can store and retrieve state data but are restricted from accessing xAPI statements.
- **Secure Client Authentication**: Uses Basic Auth and API keys for client authentication, with an additional layer of security that checks for matching origins.
- **Protection Against Data Harvesting**: The inability to retrieve statements protects against attacks where client keys could be misused to access sensitive information.
- **Useful dashboards**: Each client has a dashboard that shows key information about engagement with activities, including number of initialisations, attempts, passes and completions (4 main verbs, all the rest are ignored)

## Comparison to Learning Locker

While xAPI-Server-Essentials provides much of the same functionality as Learning Locker for state and statement handling, the key distinction is in its security model. Learning Locker provides more flexibility in data retrieval, but xAPI-Server-Essentials takes a more restrictive approach to protect user data.

Learning locker doesn't provide useful dashboards. It provides a way to write queries that are also not that useful as the query language does not allow for powerful sorting, aggregation, grouping that modern scalable database systems (such as Mongo) provide built it.

## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/xAPI-Server-Essentials.git
    cd xAPI-Server-Essentials
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Create a `.env` file**:
    Add your MongoDB connection details, session secret, and other necessary environment variables in a `.env` file:
    ```
    MONGO_URI=mongodb://localhost:27017
    MONGO_DB=xapi_server
    SESSION_SECRET=your-secret-key
    ```

4. **Start the server**:
    ```bash
    npm start
    ```

## Usage

### Connecting your XAPI learning objects
Before you can do this you need to create a new client key which consists of two stages:
    1. Create an authority
    2. Create a client key for that authority

#### Creating authorities
Authorities are organisations, the owners of the learning activities. Click Manage clients -> Manage authorities to create one

#### Creating clients
You can now create a set of client credentials for your XAPI learning objects to use under Manage clients. You should create a new client for every new learning experience, which may consist of one or more activities you want to track as part of one experience. In order for the dashbaord to work you will need to specify the activity IDs you want to track. These are the URIs for each actiity in your XAPI objects and correspond to a top level learnin gobject like an Adapt eLearning course.

### Dashboards

### Endpoints

- **/xAPI/statements** (POST)
    - Accepts xAPI statements for submission but does **not** allow retrieval of statements.
    - This ensures no personal data can be accessed via the API, providing additional security.

- **/xAPI/activities/state** (POST/PUT/GET)
    - Manages xAPI state data for learning activities.
    - Clients can store state data using `POST/PUT` and retrieve state data using `GET`.

### Authentication

The server uses Basic Authentication with API keys to authenticate clients. Clients are required to provide the following information in the request headers:

- `Authorization: Basic {base64(api_key:api_secret)}`
- `Origin`: Must match the client's registered origin to pass the origin check.

### Security

xAPI-Server-Essentials enforces strict limitations on the operations a client can perform:
- **Statements**: Clients can only submit xAPI statements but cannot retrieve them.
- **State**: Clients can store and retrieve state data, ensuring proper functionality for tracking learner progress without exposing sensitive data.

This design is intended to protect against attacks where an API key could be used to gather personal or private information.

## Configuration

You can configure the server via the `.env` file:
- **MONGO_URI**: MongoDB connection URI.
- **MONGO_DB**: MongoDB database name.
- **SESSION_SECRET**: Secret key for sessions.

You can then access your instance and configure authorities (organisations) and client keys for the differnt clients (eLearning deployments). You should use a different client key per "course".

## Security Considerations

The server includes multiple layers of security to protect against unauthorized access:
- **Client Restrictions**: Clients are strictly limited in the operations they can perform (no statement retrieval).
- **Origin Checks**: Requests must originate from approved domains.
- **Basic Auth**: Ensures that only authorized clients can submit or retrieve state data.

## Roadmap

- **Improved Logging**: Add detailed logs for tracking request/response flow.
- **Basic dashboards**: Add basic dashboards of key information for each "course".

## Contributing

If you would like to contribute to this project, please submit a pull request or open an issue to discuss any features or improvements.

## License

This project is licensed under the MIT License.