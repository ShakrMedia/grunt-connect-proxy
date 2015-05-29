/*
 * grunt-connect-proxy
 * https://github.com/drewzboto/grunt-connect-proxy
 *
 * Copyright (c) 2013 Drewz
 * Licensed under the MIT license.
 */

'use strict';
var utils = require('../lib/utils');
var _ = require('lodash');

module.exports = function(grunt) {
  grunt.registerTask('configureProxies', 'Configure any specified connect proxies.', function(config) {
    // setup proxy
    var httpProxy = require('http-proxy');
    var proxyOption;
    var proxyOptions = [];
    var validateProxyConfig = function(proxyOption) {
        if (_.isUndefined(proxyOption.host) || _.isUndefined(proxyOption.context)) {
            grunt.log.error('Proxy missing host or context configuration');
            return false;
        }
        if (proxyOption.https && proxyOption.port === 80) {
            grunt.log.warn('Proxy  for ' + proxyOption.context + ' is using https on port 80. Are you sure this is correct?');
        }
        return true;
    };

    utils.reset();
    utils.log = grunt.log;
    if (config) {
        var connectOptions = grunt.config('connect.'+config) || [];
        if (typeof connectOptions.appendProxies === 'undefined' || connectOptions.appendProxies) {
            proxyOptions = proxyOptions.concat(grunt.config('connect.proxies') || []);
        }
        proxyOptions = proxyOptions.concat(connectOptions.proxies || []);
    } else {
        proxyOptions = proxyOptions.concat(grunt.config('connect.proxies') || []);
    }
    proxyOptions.forEach(function(proxy) {
        proxyOption = _.defaults(proxy,  {
            port: proxy.https ? 443 : 80,
            https: false,
            xforward: false,
            rules: [],
            ws: false
        });
        if (validateProxyConfig(proxyOption)) {
            proxyOption.rules = utils.processRewrites(proxyOption.rewrite);
            utils.registerProxy({
                server: httpProxy.createProxyServer({
                    target: utils.getTargetUrl(proxyOption),
                    secure: proxyOption.https,
                    xfwd: proxyOption.xforward,
                    headers: {
                        host: proxyOption.host
                    }
                }).on('error', function (err, req, res) {
                    grunt.log.error('Proxy error: ', err.code);
                }).on('proxyReq', function(proxyReq, req, res, options) {
                    if (!_.isUndefined(proxyOption.rewriteHost)) {
                        proxyReq.setHeader('Host', proxyOption.rewriteHost);
                    }
                }),
                config: proxyOption
            });
            grunt.log.writeln('Proxy created for: ' +  proxyOption.context + ' to ' + proxyOption.host + ':' + proxyOption.port);
        }
    });
  });
};
