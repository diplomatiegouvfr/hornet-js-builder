// load Unit.js module
var test = require('unit.js');
var helper = require("../src/helpers")

describe("N'autorise jamais les prerelease pour les projets RELEASE", function(){
    var version = "1.2.3";
    var versionPrerelease = "1.2.3-alpha";
    it(version + ' (mode prerelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "X")).isTrue();
    });

    it(version + ' (mode prerelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "X")).isTrue();
    });

    it(versionPrerelease + ' (mode prerelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "X")).isFalse();
    });

    it(versionPrerelease  + ' (mode prerelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "X")).isFalse();
    });
});

describe("N'autorise jamais les prerelease pour les projets RELEASE sur module HORNET", function(){
    var version = "~5.0.1";
    var versionPrerelease = "5.0.1-0";
    it(version + ' (mode prerelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "hornet-js-ts-typings")).isTrue();
    });

    it(version + ' (mode prerelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "hornet-js-ts-typings")).isTrue();
    });

    it(versionPrerelease + ' (mode prerelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "hornet-js-ts-typings")).isFalse();
    });

    it(versionPrerelease  + ' (mode prerelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "hornet-js-ts-typings")).isFalse();
    });
});


describe("Autorise les prerelease pour les projets NOT RELEASE sur les modules <> hornet", function(){
    var version = "1.2.3";
    var versionPrerelease = "1.2.3-alpha";

    it(version + ' (mode preprelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "X")).isTrue();
    });

    it(version + ' (mode preprelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "X")).isTrue();
    });

    it(versionPrerelease + ' (mode preprelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "X")).isTrue();
    });

    it(versionPrerelease  + ' (mode preprelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "X")).isTrue();
    });
});

describe("Autorise les prerelease pour les projets NOT RELEASE ET un module hornet si paramètre activé", function(){

    var version = "~1.2";
    var versionPrerelease = "~1.2.3-alpha";

    it(version + ' (mode preprelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "hornet")).isTrue();
    });

    it(version + ' (mode preprelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "hornet")).isTrue();
    });

    it(versionPrerelease + ' (mode preprelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "hornet")).isFalse();
    });

    it(versionPrerelease  + ' (mode preprelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-notrelease-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "hornet")).isTrue();
    });

    it(version + ' (mode preprelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "hornet")).isTrue();
    });

    it(version + ' (mode preprelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(version, "hornet")).isTrue();
    });

    it(versionPrerelease + ' (mode preprelease unauthorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withUnauthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "hornet")).isFalse();
    });

    it(versionPrerelease  + ' (mode preprelease authorized)', function(){
        var workspacePath = process.cwd();
        process.cwd = function() {
            return __dirname + "/projet-release-withAuthorizedPrerelease/"
        }
        test.bool(helper.isValidVersion(versionPrerelease, "hornet")).isFalse();
    });
});