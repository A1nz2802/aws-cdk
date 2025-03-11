# Update system and install httpd (Apache)
yum update -y
yum install -y httpd

# Start httpd service and enable it to start on boot
systemctl start httpd
systemctl enable httpd

# Fetch metadata using IMDSv2
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl http://169.254.169.254/latest/meta-data/instance-id -H "X-aws-ec2-metadata-token: $TOKEN")
AMI_ID=$(curl http://169.254.169.254/latest/meta-data/ami-id -H "X-aws-ec2-metadata-token: $TOKEN")
INSTANCE_TYPE=$(curl http://169.254.169.254/latest/meta-data/instance-type -H "X-aws-ec2-metadata-token: $TOKEN")

# Create a web page to display the metadata
cat <<EOF > /var/www/html/index.html
<html>
<head>
    <title>EC2 Instance Metadata :P</title>
</head>
<body>
    <h1>EC2 Instance Metadata</h1>
    <p>Instance ID: $INSTANCE_ID</p>
    <p>AMI ID: $AMI_ID</p>
    <p>Instance Type: $INSTANCE_TYPE</p>
</body>
</html>
EOF