require('dotenv').config();

const Shopify = require("shopify-api-node");
const {query} = require("express");

const { SHOP, ACCESS_TOKEN } = process.env;
const Weekly_Collection = 429612368187;

const shopify = new Shopify({
    shopName: SHOP,
    accessToken: ACCESS_TOKEN
});

const WEEKLY_PRICE = "15.00";
const FOREVER_PRICE = "18.00";

shopify.smartCollection.get(Weekly_Collection) // Get the weekly collection
    .then((collection) => {
        let oldTag = collection.rules[0].condition; // Get current collection tag

        let weekNbr = oldTag.charAt(oldTag.length - 1); // Get week number on the tag
        weekNbr = String.fromCharCode(weekNbr.charCodeAt(0) + 1); // increment week number

        let newTag = "W" + weekNbr;

        let updatedRule = {
            column: 'tag',
            relation: 'equals',
            condition: newTag
        };

        let queryOld = `{ products(first: 5, query: "tag:` + oldTag + `") {
                            edges {
                              node {
                                id
                              }
                            }
                          }
                        }`;

        let queryNew = `{ products(first: 5, query: "tag:` + newTag + `") {
                            edges {
                              node {
                                id
                              }
                            }
                          }
                        }`;


        shopify.graphql( queryOld ) // Get the list of old weekly products, add forever to their tags and update their price
            .then((result) => {
                let products_data = result.products.edges;

                products_data.forEach(node => {
                    let id = node.node.id;
                    id = id.replace("gid://shopify/Product/", "");
                    shopify.product.get(id)
                        .then((product) => {
                            product.tags = oldTag + ', forever';
                            product.variants.forEach(variant => {
                               variant.price = FOREVER_PRICE;
                            });
                            shopify.product.update(id, product)
                                .then((result) => {
                                    //console.log(result);
                                })
                                .catch((error) => {
                                    console.error('Error updating product with id "' + id + '":', error);
                                });
                            //console.log(product);
                        })
                        .catch((error) => {
                            console.error('Error getting product with id "' + id + '":', error);
                        });
                });
            })
            .catch((error) => {
                console.error('Error retrieving products with tag "' + oldTag + '":', error);
            });

        shopify.graphql( queryNew ) // Get the list of new weekly products, make them active and update their price
            .then((result) => {
                let products_data = result.products.edges;

                products_data.forEach(node => {
                    let id = node.node.id;
                    id = id.replace("gid://shopify/Product/", "");
                    shopify.product.get(id)
                        .then((product) => {
                            //product.status = "active";
                            product.variants.forEach(variant => {
                                variant.price = WEEKLY_PRICE;
                            });
                            shopify.product.update(id, product)
                                .then((result) => {
                                    console.log(result);
                                })
                                .catch((error) => {
                                    console.error('Error updating product with id "' + id + '":', error);
                                });
                            //console.log(product);
                        })
                        .catch((error) => {
                            console.error('Error getting product with id "' + id + '":', error);
                        });
                });
            })
            .catch((error) => {
                console.error('Error retrieving products with tag "' + oldTag + '":', error);
            });

        shopify.smartCollection.update(Weekly_Collection, { rules: [updatedRule] }) //Update the weekly collection to show the next week products
            .then((collection) => {
                //console.log('Successfully updated collection tags:', collection.rules[0]);
            })
            .catch((error) => {
                console.error('Error updating collection tags:', error);
            });
    })
    .catch(err => {
        console.error(err);
    });