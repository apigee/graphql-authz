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

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

const query = `{
  listener {
    playback {
      current(
        sourceId: "SF:16722:54534"
        deviceUuid: "foo"
  
      ) {
        sourceId
        index
        pandoraId
        artId
        audioUrl
        annotation {
          name
          ... on Track {
            duration
            artist {
              name
            }
            album {
              name
            }
          }
        }
      }
    }
  }
}`;

const all_query_entitlements = [ 'query.listener.playback.current.sourceId',
    'query.listener.playback.current.index',
    'query.listener.playback.current.pandoraId',
    'query.listener.playback.current.artId',
    'query.listener.playback.current.audioUrl',
    'query.listener.playback.current.annotation.name',
    'query.listener.playback.current.annotation.Track.duration',
    'query.listener.playback.current.annotation.Track.artist.name',
    'query.listener.playback.current.annotation.Track.album.name' ];

describe('Authorization', function() {
    describe('Test with empty entitlements', function() {
        it('should not match any query entitlements', function() {
            let missing_entitlements = graphql.authorize(query, []);
            expect(all_query_entitlements).to.eql(missing_entitlements);
        });
    });

    describe('Test double wildcard at top level', function() {
        it('should match all entitlements', function() {
            let missing_entitlements = graphql.authorize(query, ['**']);
            expect([]).to.eql(missing_entitlements);
        });
    });

    describe('Test double wildcard one level deep', function() {
        it('should match all entitlements', function() {
            let missing_entitlements = graphql.authorize(query, ['query.listener.**']);
            expect(missing_entitlements).to.eql([]);
        });
    });

    describe('Test double wildcard one level deep with wrong parent', function() {
        it('should not match any query entitlements', function() {
            let missing_entitlements = graphql.authorize(query, ['query.stations.**']);

            expect(all_query_entitlements).to.eql(missing_entitlements);
        });
    });

    describe('Test single wildcard at top level', function() {
        it('should not match any query entitlements', function() {
            let missing_entitlements = graphql.authorize(query, ['*']);

            expect(all_query_entitlements).to.eql(missing_entitlements);
        });
    });

    describe('Test single wildcard one level deep', function() {
        it('should not match any query entitlements', function() {
            let missing_entitlements = graphql.authorize(query, ['listener.*']);

            expect(all_query_entitlements).to.eql(missing_entitlements);
        });
    });

    describe('Test single wildcard up to four levels', function() {
        it('should match only entitlements with 4 segments', function() {
            let missing_entitlements = graphql.authorize(query, ['query.listener.*.*.*']);

            let expected_entitlements = [
                "query.listener.playback.current.annotation.name",
                "query.listener.playback.current.annotation.Track.duration",
                "query.listener.playback.current.annotation.Track.artist.name",
                "query.listener.playback.current.annotation.Track.album.name",
            ];

            expect(expected_entitlements).to.eql(missing_entitlements);
        });
    });


    describe('Test with unclosed bad query', function() {
        it('should throw syntax error', function() {
            assert.throws(function() {
                graphql.authorize('{');
            }, /Syntax Error: Expected Name, found <EOF>/gi);
        });
    });

    describe('Test with empty query', function() {
        it('should throw syntax error', function() {
            assert.throws(function() {
                graphql.authorize('{}');
            }, /Syntax Error: Expected Name, found }/gi);
        });
    });

    describe('Test with no query', function() {
        it('should throw syntax error', function() {
           assert.throws(function() {
                graphql.authorize();
           }, /Syntax Error: Null or empty string/gi);
        });
    });

    describe('Test with no entitlements', function() {
        it('should not match any query entitlements', function() {
            let missing_entitlements = graphql.authorize(query);

            expect(all_query_entitlements).to.eql(missing_entitlements);
        });
    });
});

