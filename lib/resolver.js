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

if (!properties) {
    //fake the properties map
    properties = {};
}

if (!context) {
    //fake the context object
    context = { getVariable: () => {} , setVariable: () => {}  };
}

function resolveVars(str) {
    if (!str || !str.replace) {
        return null;
    }

    let replaced = str.replace(/\{([a-z0-9_.]+)\}/gi, function(match, p1) {
        return getVar(p1) || match;
    });

    return replaced;
}


function getProp(prop_name) {
    return properties[prop_name];
}

function getVar(var_name) {
    return context.getVariable(var_name);
}

function setVar(var_name, var_val) {
    context.setVariable(var_name, var_val);
}

function resolveProp(prop_name, defaultValue) {
    let prop_value = getProp(prop_name);
    let result = resolveVars(prop_value);

    if (!result && typeof defaultValue !== 'undefined') {
        return defaultValue;
    }

    return result;
}

module.exports.resolveVars = resolveVars;
module.exports.getVar = getVar;
module.exports.setVar = setVar;
module.exports.getProp = getProp;
module.exports.resolveProp = resolveProp;