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

const graphql = require('../lib/graphql');
const path = require('path');
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;


const schema_with_scopes = fs.readFileSync(path.join(__dirname,'/data/forum-with-scopes.graphql')).toString();
const schema_without_scopes = fs.readFileSync(path.join(__dirname,'/data/forum-without-scopes.graphql')).toString();

describe('Schema to entitlements', function() {
    describe('Test schema with scopes', function() {
        it('should not match any query entitlements', function() {
            let schema_entitlements = graphql.schemaToEntitlements(schema_with_scopes);
            let expected_schema_entitlements=  {
                "admin": [
                    "mutation.upvotePost.author.*",
                    "mutation.upvotePost.author.**",
                    "mutation.author.*",
                    "mutation.author.**",
                    "mutation.author.posts.author.*",
                    "mutation.author.posts.author.**",
                ],
                "scopea": [
                    "query.posts",
                    "query.posts.**",
                ],
                "scopeb": [
                    "query.author",
                    "query.author.**",
                ],
                "scopec": [
                    "query.author.posts",
                    "query.author.posts.**",
                    "query.posts.author.posts",
                    "query.posts.author.posts.**"
                ]
            };

            expect(expected_schema_entitlements).to.eql(schema_entitlements);
        });
    });

    describe('Test schema without scopes', function() {
        it('should not match any query entitlements', function() {
            let schema_entitlements = graphql.schemaToEntitlements(schema_without_scopes);
            let expected_schema_entitlements=  {};

            expect(expected_schema_entitlements).to.eql(schema_entitlements);
        });
    });

    describe('Test with invalid schema', function() {
        it('should throw syntax error', function() {
            assert.throws(function() {
                graphql.schemaToEntitlements('abc');
            }, /Syntax Error: Unexpected Name "abc"/gi);
        });
    });





});

