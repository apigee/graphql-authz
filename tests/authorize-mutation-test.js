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

const mutation = `mutation setProg {
  listener {
    playback {
      setProgress(
        deviceUuid: "foo"
        sourceId: "ST:0:4154071457467496343"
        index: 0
        elapsedTime: 123
      ) {
        _
      }
    }
  }
}

`;

const all_mutation_entitlements = [ 'mutation.listener.playback.setProgress._'];

describe('Authorization', function() {
    describe('Test with empty entitlements', function() {
        it('should not match any query entitlements', function() {
            let missing_entitlements = graphql.authorize(mutation, []);
            expect(all_mutation_entitlements).to.eql(missing_entitlements);
        });
    });
});

