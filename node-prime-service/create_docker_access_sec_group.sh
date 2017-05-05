cf create-security-group docker_access docker_access_sec_group
cf bind-staging-security-group docker_access
cf bind-running-security-group docker_access
