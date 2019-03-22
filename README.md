## GraphQL AuthZ in Apigee Edge



Table of contents
=================
<ul>
  <li><a href="#description">Description</a></li>
  <li><a href="#key-components">Key Components</a></li>
  <li><a href="#architecture">Architecture</a></li>
  <li><a href="#building-the-library-and-callout">Building the library and callout</a></li>
  <li><a href="#annotating-graphql-schema-with-scopes">Annotating GraphQL schema with scopes</a></li>
  <li><a href="#using-the-library-in-an-apigee-proxy">Using the library in an Apigee Proxy</a></li>
  <li><a href="#using-the-javascript-callout-in-an-apigee-proxy">Using the JavaScript Callout in an Apigee Proxy</a></li>
  <li><a href="#library-functions-reference">Library Functions Reference</a></li>
</ul>

### Description

This repo provides tooling to enable GraphQL query authorization in Apigee Edge. We also provide a CLI tool that makes it easy at build time to extract an authorization mapping between scopes and entitlements from a GraphQL schema. For run-time, we provide an Apigee JavaScript callout that can be used in combination with the authorization mapping to authorize a GraphQL query.

### Key Components

This module uses the graphql.js library to provide the following:
 
  1) A JavaScript GraphQL library (**graphql.lib.js**) that can be used within other Apigee's JavaScript callouts.
  2) A standalone Apigee JavaScript callout (**graphql.jsc.js**) that can be used to authorize GraphQL queries before proxying to a backend GraphQL server.
  3) A command (**gql-s2e**) for converting GraphQL schemas to a map of scopes ⇨ entitlements.

### Architecture 

This is the architecture used to enable the above 3 components.

![Architecture](/images/arch.png)


### Building the library and callout

This step builds both the  **graphql.lib.js**, and **graphql.jsc.js** files. The output is under the **dist** directory.

```
  $ npm run build
```

By default, it produces uglify-ed/minify-ed outputs. If you want pretty-fied output use:
 
```
  $ npm run build-pretty
```

### Building gql-s2e CLI

To make gql-s2e available to run in your path, run the following

```
  $ npm link
```
By running this, a link is created from the bin directory of your Node.js installation to the location where you have cloned this repo.

### Annotating GraphQL schema with scopes

Below is a sample of how you can add scopes using the <code>@scope</code> directive in your GraphQL schema. 
The <code>@scope</code> directive is a custom directive in this project.

```
  # sample schema from Apollo Server (https://www.apollographql.com/docs/graphql-tools/generate-schema.html)
  directive @scope(value: String) on OBJECT
  
  type Author {
      id: Int!
      firstName: String
      lastName: String
      """
      the list of Posts by this author
      """
      posts: [Post]
  }
  
  type Post {
      id: Int!
      title: String
      author: Author
      votes: Int
  }
  
  # the schema allows the following query:
  type Query {
      posts: [Post]  @scope (name:"scopea", query: true)
      author(id: Int!): Author @scope (name:"scopeb", query: true)
  }
  
  # this schema allows the following mutation:
  type Mutation {
      upvotePost (
          postId: Int!
      ): Post @scope (name: "scopec", mutation: true)
  }

  
```

Using the schema above, run the following command: <code>gql-s2e yourfile.graphql</code>.

Here is a sample output:

```
  {
    "scopea": [
      "query.posts"
      "query.posts.**"
    ],
    "scopeb": [
      "query.author"
      "query.author.**"
    ],
    "scopec": [
      "mutation.upvotePost"
      "mutation.upvotePost.**"
    ]
  }
```

### Using the library in an Apigee Proxy

1.<b> Create JavaScript Resource</b>: Use the Apigee UI or the Management Server API to create a new JavasScript resource that is the content of <code>graphql.lib.js</code>.<br/><br/>
2.<b> Create JavaScript policy</b>: Create a new JavaScript policy and reference the <code>**graphql.js**</code> file using <IncludeURL> tag.
```
  <IncludeURL>jsc://graphql.lib.js</IncludeURL>
```
3.<b> Use the exported functions</b>: Within the source of the JavaScript policy from step 2, you can now make use of the functions under the <code>graphql.*</code> object.



### Using the JavaScript Callout in an Apigee Proxy

1.<b> Create JavaScript policy</b>: Create a new JavaScript policy, using the contents of the  **dist/graphql.jsc.js** file.<br/><br/>
2.<b> Set the Callout properties</b>: Within the XML configuration of the JSC Callout (from step 1), set the callout properties.
```
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Javascript async="false" continueOnError="false" enabled="true" timeLimit="200" name="Authz">
        <DisplayName>Authz</DisplayName>
        <Properties>
            <Property name="input">{query}</Property>
            <Property name="entitlements">{entitlements}</Property>
            <Property name="debug">true</Property>
        </Properties>
        <ResourceURL>jsc://graphql.jsc.js</ResourceURL>
    </Javascript>
```


If authorization succeeds, the JavaScript Callout completes silently.
If authorization fails, the JavaScript Callout throws an error.



### Library Functions Reference

The following library functions are exported within the <code>**graphql**</code> object made available in from <code>**dist/graphql.lib.js**</code>:


#### Array[String] graphql.<i>authorize</i>(String input, Array[String] entitlements) 

<p>
This function takes an input query or mutation and checks that all the paths are satisfied by the given list of entitlements.

The return value is an empty array [], if all the given entitlements satisfy the paths being accessed in the input query/mutation. 
Otherwise, it returns the list of paths, from the input mutation/query, which have not been satisfied.


Each entitlement itself is structured as a dot separated hierarchy of Fields

     e.g.

     query.GrandParent.Parent.Child

 You can use a single wildcard as place-holder for a single field

     e.g.

     query.GrandParent.*.Child

     (This would match the Child field who has a GrandParent, two levels up)

 You can use double wildcard as placeholder for multiple fields

     e.g.

     query.GrandParent.**

     (This would match any hierarchy that starts with GrandParent)
     
  Entitlements for queries begin with "**query.**", and entitlements for mutations begin with "**mutation.**".
 
</p>


#### AST graphql.<i>parse</i>(String input) 

<p>

This function takes an input query/mutation and parses it, thus verifying it's syntactically correct.

The return value is the AST representing the query/mutation itself. If an error occurs, the function throws a GraphQLError.

</p>

#### Array[String] graphql.<i>getPaths</i>(String input) 

<p>

This function takes an input query/mutation, and flattens to convert it to a list of paths.

e.g. This query:

     {
       employee(id: "foo") {
         profile {
           fname,
           last
         }
       }
     }
     
Results in the following list of paths:
     
     [
       "query.employee.profile.fname"
       "query.employee.profile.last"
     ]

</p>


#### Map{String, Array[String]} graphql.schemaToEntitlements(String input)

<p>

This function derives the entitlements from a GraphQL schema that is annotated with **@scope** directives.
 
The location of the **@scope** directive indicates the paths that are accessible by the given scope.
 
The **@scope** directive to a GraphQL type, or a field within a type.
Depending on where you put the @scope directive, it has different meaning.
 
* If the **@scope** directive appears on a GraphQL type, then it applies to all fields of this GraphQL type
   (NOTE: this is not the same as all the fields within the GraphQL type)
 
* If the **@scope** directive appears on a field, then it applies only the field itself (regardless of the GraphQL type)
 

The **@scope** directive is defined as follows:
 
    directive @scope(name: String!, query: Boolean = false, mutation: Boolean = false, cascade: Boolean = true)

where
 
 * **name** - Name of the scope
 * **query** - Whether or not the scope is relevant to queries
 * **mutation** -  Whether or not the scope is relevant to mutations
 * **cascade** - Whether or not the scope is applicable to the descendants of the field.


The return value of this function is a map of scopes to entitlements.

e.g.
 
    { 
      "scopeA": [ "query.employee","query.employee.**"],
      "scopeB" : [ "query.company","query.company.**"]
    }

</p>


## Not Google Product Clause

This is not an officially supported Google product.
