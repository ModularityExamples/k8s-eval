cf cups -p '{ "url": "postgres://postgres:mysecretpassword@192.168.50.100:5432/prime" }'

cf bs prime-service-broker postgres
cf bs prime-service postgres

cf restage prime-service-broker
cf restage prime-service
