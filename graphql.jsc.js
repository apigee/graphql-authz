// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { setVar, resolveProp } = require('./lib/resolver');
const { authorize, errors } = require('./lib/graphql');
const { errorMessage } = require('./lib/util');


function authz() {

    let input = resolveProp("input");
    let entitlements = resolveProp("entitlements");
    let debug = resolveProp("debug");

    if (debug) {
        print("graphql.authz.input: " + input);
        print("graphql.authz.entitlements: " + entitlements);
    }

    try {
        let unauthorized_paths = authorize(input, entitlements);
        let authorized = (unauthorized_paths.length === 0);

        if (debug) {
            print("graphql.authz.unauthorized_paths: " + unauthorized_paths.join(","));
            print("graphql.authz.authorized: " + authorized);
        }

        setVar("graphql.authz.authorized", authorized);

        if (authorized) {
            return; //exit early
        }

        let error_message = "GraphQL: Unauthorized access to: " + unauthorized_paths.join(",");

        if (debug) {
            print("graphql.authz.error_message: " + error_message);
        }

        setVar("graphql.authz.unauthorized_paths", unauthorized_paths);
        setVar("graphql.authz.error_message", error_message);

        throw error_message;
    } catch (ex) {
        if (ex instanceof errors.GraphQLError) {
            let message = errorMessage(ex);
            setVar("graphql.authz.error_message", message);
            throw message;
        }

        throw ex;
    }
}

authz();
