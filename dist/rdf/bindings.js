/* file : bindings.ts
MIT License

Copyright (c) 2018 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
/**
 * A set of mappings from a variable to a RDF Term.
 * @abstract
 * @author Thomas Minier
 */
var Bindings = /** @class */ (function () {
    function Bindings() {
        this._properties = new Map();
    }
    /**
     * Get metadata attached to the set using a key
     * @param  key - Metadata key
     * @return The metadata associated with the given key
     */
    Bindings.prototype.getProperty = function (key) {
        return this._properties.get(key);
    };
    /**
     * Check if a metadata with a given key is attached to the set
     * @param  key - Metadata key
     * @return Tur if the metadata exists, False otherwise
     */
    Bindings.prototype.hasProperty = function (key) {
        return this._properties.has(key);
    };
    /**
     * Attach metadata to the set
     * @param key - Key associated to the value
     * @param value - Value to attach
     */
    Bindings.prototype.setProperty = function (key, value) {
        this._properties.set(key, value);
    };
    /**
     * Serialize the set of mappings as a plain JS Object
     * @return The set of mappings as a plain JS Object
     */
    Bindings.prototype.toObject = function () {
        return this.reduce(function (acc, variable, value) {
            acc[variable] = value;
            return acc;
        }, {});
    };
    /**
     * Serialize the set of mappings as a string
     * @return The set of mappings as a string
     */
    Bindings.prototype.toString = function () {
        var value = this.reduce(function (acc, variable, value) {
            if (!value.startsWith('"')) {
                value = "<" + value + ">";
            }
            return acc + " " + variable + " -> " + value + ",";
        }, '{');
        return value.substring(0, value.length - 1) + ' }';
    };
    /**
     * Creates a deep copy of the set of mappings
     * @return A deep copy of the set
     */
    Bindings.prototype.clone = function () {
        var cloned = this.empty();
        // copy properties then values
        if (this._properties.size > 0) {
            this._properties.forEach(function (value, key) {
                cloned.setProperty(key, value);
            });
        }
        this.forEach(function (variable, value) {
            cloned.set(variable, value);
        });
        return cloned;
    };
    /**
     * Test the equality between two sets of mappings
     * @param other - A set of mappings
     * @return True if the two sets are equal, False otherwise
     */
    Bindings.prototype.equals = function (other) {
        if (this.size !== other.size) {
            return false;
        }
        for (var variable in other.variables()) {
            if (!(this.has(variable)) || (this.get(variable) !== other.get(variable))) {
                return false;
            }
        }
        return true;
    };
    /**
     * Bound a triple pattern using the set of mappings, i.e., substitute variables in the triple pattern
     * @param triple  - Triple pattern
     * @return An new, bounded triple pattern
     */
    Bindings.prototype.bound = function (triple) {
        var newTriple = Object.assign({}, triple);
        if (triple.subject.startsWith('?') && this.has(triple.subject)) {
            newTriple.subject = this.get(triple.subject);
        }
        if (triple.predicate.startsWith('?') && this.has(triple.predicate)) {
            newTriple.predicate = this.get(triple.predicate);
        }
        if (triple.object.startsWith('?') && this.has(triple.object)) {
            newTriple.object = this.get(triple.object);
        }
        return newTriple;
    };
    /**
     * Creates a new bindings with additionnal mappings
     * @param values - Pairs [variable, value] to add to the set
     * @return A new Bindings with the additionnal mappings
     */
    Bindings.prototype.extendMany = function (values) {
        var cloned = this.clone();
        values.forEach(function (v) {
            cloned.set(v[0], v[1]);
        });
        return cloned;
    };
    /**
     * Perform the union of the set of mappings with another set
     * @param other - Set of mappings
     * @return The Union set of mappings
     */
    Bindings.prototype.union = function (other) {
        var cloned = this.clone();
        other.forEach(function (variable, value) {
            cloned.set(variable, value);
        });
        return cloned;
    };
    /**
     * Perform the intersection of the set of mappings with another set
     * @param other - Set of mappings
     * @return The intersection set of mappings
     */
    Bindings.prototype.intersection = function (other) {
        var res = this.empty();
        this.forEach(function (variable, value) {
            if (other.has(variable) && other.get(variable) === value) {
                res.set(variable, value);
            }
        });
        return res;
    };
    /**
    * Performs a set difference with another set of mappings, i.e., A.difference(B) returns all mappings that are in A and not in B.
    * @param  other - Set of mappings
    * @return The results of the set difference
    */
    Bindings.prototype.difference = function (other) {
        return this.filter(function (variable, value) {
            return (!other.has(variable)) || (value !== other.get(variable));
        });
    };
    /**
     * Test if the set of bindings is a subset of another set of mappings.
     * @param  other - Superset of mappings
     * @return Ture if the set of bindings is a subset of another set of mappings, False otherwise
     */
    Bindings.prototype.isSubset = function (other) {
        var _this = this;
        return Array.from(this.variables()).every(function (v) {
            return other.has(v) && other.get(v) === _this.get(v);
        });
    };
    /**
     * Creates a new set of mappings using a function to transform the current set
     * @param mapper - Transformation function (variable, value) => [string, string]
     * @return A new set of mappings
     */
    Bindings.prototype.map = function (mapper) {
        var result = this.empty();
        this.forEach(function (variable, value) {
            var _a = __read(mapper(variable, value), 2), newVar = _a[0], newValue = _a[1];
            if (!(lodash_1.isNull(newVar) || lodash_1.isUndefined(newVar) || lodash_1.isNull(newValue) || lodash_1.isUndefined(newValue))) {
                result.set(newVar, newValue);
            }
        });
        return result;
    };
    /**
     * Same as map, but only transform variables
     * @param mapper - Transformation function
     * @return A new set of mappings
     */
    Bindings.prototype.mapVariables = function (mapper) {
        return this.map(function (variable, value) { return [mapper(variable, value), value]; });
    };
    /**
     * Same as map, but only transform values
     * @param mapper - Transformation function
     * @return A new set of mappings
     */
    Bindings.prototype.mapValues = function (mapper) {
        return this.map(function (variable, value) { return [variable, mapper(variable, value)]; });
    };
    /**
     * Filter mappings from the set of mappings using a predicate function
     * @param predicate - Predicate function
     * @return A new set of mappings
     */
    Bindings.prototype.filter = function (predicate) {
        return this.map(function (variable, value) {
            if (predicate(variable, value)) {
                return [variable, value];
            }
            return [null, null];
        });
    };
    /**
     * Reduce the set of mappings to a value which is the accumulated result of running each element in collection thru a reducing function, where each successive invocation is supplied the return value of the previous.
     * @param reducer - Reducing function
     * @param start - Value used to start the accumulation
     * @return The accumulated value
     */
    Bindings.prototype.reduce = function (reducer, start) {
        var acc = start;
        this.forEach(function (variable, value) {
            acc = reducer(acc, variable, value);
        });
        return acc;
    };
    /**
     * Test if some mappings in the set pass a predicate function
     * @param  predicate - Function to test for each mapping
     * @return True if some mappings in the set some the predicate function, False otheriwse
     */
    Bindings.prototype.some = function (predicate) {
        var res = false;
        this.forEach(function (variable, value) {
            res = res || predicate(variable, value);
        });
        return res;
    };
    /**
     * Test if every mappings in the set pass a predicate function
     * @param  predicate - Function to test for each mapping
     * @return True if every mappings in the set some the predicate function, False otheriwse
     */
    Bindings.prototype.every = function (predicate) {
        var res = true;
        this.forEach(function (variable, value) {
            res = res && predicate(variable, value);
        });
        return res;
    };
    return Bindings;
}());
exports.Bindings = Bindings;
/**
 * A set of mappings from a variable to a RDF Term, implements using a HashMap
 * @author Thomas Minier
 */
var BindingBase = /** @class */ (function (_super) {
    __extends(BindingBase, _super);
    function BindingBase() {
        var _this = _super.call(this) || this;
        _this._content = new Map();
        return _this;
    }
    Object.defineProperty(BindingBase.prototype, "size", {
        get: function () {
            return this._content.size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindingBase.prototype, "isEmpty", {
        get: function () {
            return this.size === 0;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Creates a set of mappings from a plain Javascript Object
     * @param obj - Source object to turn into a set of mappings
     * @return A set of mappings
     */
    BindingBase.fromObject = function (obj) {
        var res = new BindingBase();
        for (var key in obj) {
            res.set(!key.startsWith('?') ? "?" + key : key, obj[key]);
        }
        return res;
    };
    BindingBase.prototype.variables = function () {
        return this._content.keys();
    };
    BindingBase.prototype.values = function () {
        return this._content.values();
    };
    BindingBase.prototype.get = function (variable) {
        if (this._content.has(variable)) {
            return this._content.get(variable);
        }
        return null;
    };
    BindingBase.prototype.has = function (variable) {
        return this._content.has(variable);
    };
    BindingBase.prototype.set = function (variable, value) {
        this._content.set(variable, value);
    };
    BindingBase.prototype.clear = function () {
        this._content.clear();
    };
    BindingBase.prototype.empty = function () {
        return new BindingBase();
    };
    BindingBase.prototype.forEach = function (callback) {
        this._content.forEach(function (value, variable) { return callback(variable, value); });
    };
    return BindingBase;
}(Bindings));
exports.BindingBase = BindingBase;
