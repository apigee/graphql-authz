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


const { parse:gql_parse } = require('graphql/language/parser');
const { Source } = require('graphql/language/source');
const errors = require('graphql/error');



function parse(query) {
    if (!query) {
        throw new errors.syntaxError(null, 0, 'Null or empty string');
    }

    if (typeof query === 'string') {
        return gql_parse(new Source(query));
    }

    return query;
}

function getPaths(query) {
    query = parse(query);

    let all_entitlements = [];

    if (query.kind === 'Document' && query.definitions && query.definitions.length > 0) {
        query.definitions.forEach(function (definition) {
            let sub_entitlements = getPaths(definition);
            all_entitlements = all_entitlements.concat(sub_entitlements);
        })

    } else if (query.kind === 'OperationDefinition' && query.operation === 'query' &&
        query.selectionSet && query.selectionSet.selections && query.selectionSet.selections.length > 0) {

        query.selectionSet.selections.forEach(function (selection) {
            let entitlements = getPaths(selection);

            entitlements.forEach(function (entitlement) {
                all_entitlements.push(`query.${entitlement}`);
            });
        });

    } else if (query.kind === 'OperationDefinition' && query.operation === 'mutation' &&
        query.selectionSet && query.selectionSet.selections && query.selectionSet.selections.length > 0) {

        query.selectionSet.selections.forEach(function (selection) {
            let entitlements = getPaths(selection);

            entitlements.forEach(function (entitlement) {
                all_entitlements.push(`mutation.${entitlement}`);
            });
        });
    } else if (query.kind === 'Field') {
        let field_name = query.name.value;
        let sub_entitlements = [];


        if (query.selectionSet && query.selectionSet.selections && query.selectionSet.selections.length > 0) {

            query.selectionSet.selections.forEach(function (selection) {
                let entitlements = getPaths(selection);
                entitlements.forEach(function (entitlement) {
                    sub_entitlements.push(`${field_name}.${entitlement}`);
                });
            });
        }

        if (sub_entitlements.length === 0) {
            all_entitlements.push(field_name);
        } else {
            all_entitlements = all_entitlements.concat(sub_entitlements);
        }
    } else if (query.kind === 'InlineFragment' && query.typeCondition && query.typeCondition.kind === 'NamedType') {
        let type_name = query.typeCondition.name.value;
        let sub_entitlements = [];

        if (query.selectionSet && query.selectionSet.selections && query.selectionSet.selections.length > 0) {


            query.selectionSet.selections.forEach(function (selection) {
                let entitlements = getPaths(selection);
                entitlements.forEach(function (entitlement) {
                    sub_entitlements.push(`${type_name}.${entitlement}`);
                });
            });
        }

        if (sub_entitlements.length === 0) {
            all_entitlements.push(type_name);
        } else {
            all_entitlements = all_entitlements.concat(sub_entitlements);
        }
    }

    return all_entitlements;
}

function entitlement_equals(a,b) {
    if (a === b) {
        return true;
    }

    // convert the left-side into a regular expression
    let regex =
        '^' + a                 //add the regex begin marker
        .replace(/\./g,'\\.')   //escape dots (these are special characters)
        .replace(/\*\*/g,'.+')  //convert ** into a Regex
        .replace(/\*/g,'[^.]+')  //convert * into Regex
        + '$';                  //add the regex end marker

    return (b.match(regex) !== null);
}

/***
 * This function takes a GraphQL query and checks that all the selections
 * in the query are satisfied by the given list of entitlements.
 *
 *
 * Each entitlement itself is structured as a Dot separated hierarchy of Fields
 *
 *     e.g.
 *     GrandParent.Parent.Child
 *
 * You can use a single wildcard as place-holder for a single field
 *
 *     e.g.
 *     GrandParent.*.Child
 *     (This would match the Child field who has a GrandParent, two levels up)
 *
 * You can use double wildcard as placeholder for multiple fields
 *
 *     e.g.
 *     GrandParent.**
 *     (This would match any hierarchy that starts with GrandParent)
 *
 *
 *
 * @param query
 * @param entitlements
 * @return
 *
 * Returns empty array [], if all the query entitlements are satisfied by the given list of entitlements
 * Otherwise, it returns the list of query entitlements which have not been satisfied.
 */
function authorize(query, entitlements = []) {

    if (typeof entitlements == 'string') {
        entitlements = entitlements.split(/[\s,;]+/);
    }

    query = parse(query);


    let query_entitlements = getPaths(query);

	// perform a comparison between given entitlements and requested entitlements from query
	// whenever a match is found, the element is removed from the array
	// if the request array is empty, it means all the erquests match/overlap w/entitelments 
    entitlements.forEach(function(entitlement) {
        if (query_entitlements.length == 0) {
            //exit early if there are no more query entitlements to match
            return
        }

        let elements_to_remove = [];
        for (let i = 0; i < query_entitlements.length; i++) {
            let query_entitlement = query_entitlements[i];
            if (entitlement_equals(entitlement, query_entitlement)) {
                elements_to_remove.push(i);
            }
        }

        //remove matched elements
        for (let j = elements_to_remove.length - 1; j >= 0; j--) {
            let element_to_remove = elements_to_remove[j];
            query_entitlements.splice(element_to_remove, 1);
        }
    });

    return query_entitlements;
}

function make_node(field, origin, definitions) {
    let type_name = get_field_type_name(field);
    return {
        name: field.name.value,
        children: [],
        scopes: get_scopes_from_field(field).concat(get_scopes_from_type(definitions[type_name])),
        origin: origin || false,
        type: type_name
    }
}

function make_entitlements(path, scope) {
    let fields = [];
    path.forEach(function (node) {
        fields.push(node.name);
    });

    let entitlements = [];

    if (scope.self) {
        entitlements.push(fields.join("."));
    }

    if (scope.children) {
        entitlements.push(fields.join(".") + ".*");
    }

    if (scope.descendants) {
        entitlements.push(fields.join(".") + ".**");
    }

    return entitlements;
}

function boolean(value, defaultValue) {
    if (typeof value === 'boolean') {
        return value;
    }

    return defaultValue;
}

function get_scope_from_directive(directive) {
    let scope = null;

    if (directive.name.value !== 'scope') {
        return;
    }

    let args = {};

    directive.arguments.forEach(function(arg) {
       args[arg.name.value] = arg.value.value;
    });

   return {
       name: args.name,
       query: boolean(args.query, false),
       mutation: boolean(args.mutation, false),
       descendants: boolean(args.cascade, true)
   };

}

function get_scopes_from_directives(directives) {
    let scopes = [];
    if (!directives || !directives.length) {
        return scopes;
    }

    directives.forEach(function (directive) {
        let scope = get_scope_from_directive(directive);
        if (scope) {
            scopes.push(scope);
        }
    });

    return scopes;
}


function get_scopes_from_type(type) {
    if (!type) {
        return [];
    }

    let scopes = get_scopes_from_directives(type.directives);

    scopes.forEach(function (scope) {
        scope.children = true;
        scope.self = false;
    });

    return scopes;
}

function get_scopes_from_field(field) {
    if (!field) {
        return [];
    }

    let scopes = get_scopes_from_directives(field.directives);

    scopes.forEach(function (scope) {
        scope.children = false;
        scope.self = true;
    });

    return scopes;
}

function get_field_type_name(field) {
    if (field.type) {
        return get_field_type_name(field.type);
    }
    return field.name.value;
}

function has_children(field, definitions) {
    let type = get_field_type_name(field);
    if (definitions[type] && definitions[type].fields) {
        return true;
    }
    return false;
}

function is_custom_field(field) {
    if (field.kind !== "FieldDefinition") {
        return false;
    }
    let type = get_field_type_name(field);

    if (type === "Boolean" ||
        type === "String" ||
        type === "Date" ||
        type === "Int" ||
        type === "Float"
    ) {
        return false;
    }

    return true;

}


function schemaToGraph(parsedSchema) {
    let graph = [];
    let visited_types = {};
    let queue = [];
    let children = [];
    let definitions = {};

    parsedSchema.definitions.forEach(function(definition) {
        definitions[definition.name.value] = definition;
    });


    let root_query = make_node(definitions['Query'], true, definitions);
    root_query.name = root_query.name.toLowerCase();
    queue.push(root_query);

    let root_mutation = make_node(definitions['Mutation'], true, definitions);
    root_mutation.name = root_mutation.name.toLowerCase();
    queue.push(root_mutation);

    while (queue.length > 0) {
        let node = queue.shift();
        if (visited_types[node.type]) {

            visited_types[node.type].children.forEach(function(child) {
                node.children.push(child);
            });

            graph.push(node);
            continue;
        }

        if (!definitions[node.type] || !definitions[node.type].fields) {
            graph.push(node);
            continue;
        }

        definitions[node.type].fields.forEach(function(field) {
            let child_node = make_node(field, false, definitions);
            node.children.push(child_node);
            queue.push(child_node);
        });

        visited_types[node.type] = {"children": node.children};
        graph.push(node);
    }
    return graph;
}


function is_mutation_path(path) {
    if (!path || !path.length) {
        return false;
    }

    let origin = path[0];
    return origin.name === 'mutation';
}

function is_query_path(path) {
    if (!path || !path.length) {
        return false;
    }

    let origin = path[0];
    return origin.name === 'query';
}

/***
 * This function derives the entitlements from a GraphQL schema that is annotated with @scope directives
 **
 * The location of the @scope directive indicates the paths that are accessible by the given scope.
 *
 * The @scope directive to a GraphQL type, or a field within a type.
 * Depending on where you put the @scope directive, it has different meaning.
 *
 * 1) If the @scope directive appears on a GraphQL type, then it applies to all fields of this GraphQL type
 *  (NOTE: this is not the same as all the fields within the GraphQL type)
 *
 * 2) If the @scope directive appears on a field, then it applies only the field itself (regardless of the GraphQL type)
 *
 *
 * The @scope directive is defined as follows:
 *
 *  directive  @scope(name: String!, query: Boolean, mutation: Boolean, cascade: Boolean)
 *
 *  name - This is the name of the scope
 *  query (default: false) - Whether or not this scope is relevant to GraphQL queries
 *  mutation (default: false) - Whether or not this scope is relevant to GraphQL mutations
 *  cascade - (default: true) Whether or not this scope is applicable to all the descendants of the field.
 *
 *
 * @param schemaText
 * @return
 *
 * Returns an object containing a map of scope name to a list of entitlements from the schema.
 *
 * { "scopeA": [ "query.employee","query.employee.**"],
 *   "scopeB" : [ "query.company","query.company.**"]
 *  }
 *
 */
function schemaToEntitlements(schema, maxDepth){
    maxDepth = parseInt(maxDepth) || 5;
    schema = parse(schema);

    let graph = schemaToGraph(schema);

    // starting at origins, find all possible paths to any scopes.
    // When ready to add a path, see if scope exists in object. If not,
    // create entry.

    //arbitrarily using stack for DFS

    let stack = [];
    let paths = {};

    graph.forEach(function(node) {
        if (node.origin) {
            stack.push([node]);
        }
    });

    while (stack.length > 0) {
        let path = stack.pop();

        if (path.length == maxDepth + 1) {
            continue;
        }

        let last_node = path[path.length - 1];
        //all scopes will be strings
        if (last_node.scopes.length > 0) {
            last_node.scopes.forEach(function(scope) {
                if (!paths[scope.name]) {
                    paths[scope.name] = [];
                }

                if (is_mutation_path(path) && !scope.mutation) {
                    return;
                }

                if (is_query_path(path) && !scope.query) {
                    return;
                }

                paths[scope.name] = paths[scope.name].concat(make_entitlements(path, scope));
            });
        }

        last_node.children.forEach(function (child) {
            //check if child exists in path already to avoid loops
            let found_loop = false;
            path.forEach(function (element) {
                if (element === child) {
                    found_loop = true;
                    return;
                }
            });

            if (found_loop) {
                return;
            }

            stack.push(path.concat([child]));
        });


    }

    return paths;


}

module.exports.getPaths = getPaths;
module.exports.parse = parse;
module.exports.authorize = authorize;
module.exports.schemaToEntitlements = schemaToEntitlements;
module.exports.errors = errors;
