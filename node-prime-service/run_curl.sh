
curl -X PUT --noproxy '*' -u admin:admin 'http://192.168.99.101:32200/v2/service_instances/foo/'
curl -X PUT --noproxy '*' -u admin:admin 'http://192.168.99.101:32200/v2/service_instances/foo/service_bindings/baz'
curl -X PUT --noproxy '*' -u 37b51d194a7513e45b56f6524f2d51f2:d9a43c3a20da4927890d6472996327a1 'http://192.168.99.101:32300/foo'
curl --noproxy '*' -u 37b51d194a7513e45b56f6524f2d51f2:d9a43c3a20da4927890d6472996327a1 'http://192.168.99.101:32300/foo'