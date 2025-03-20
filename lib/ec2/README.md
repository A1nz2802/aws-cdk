# Lab 3: Amazon EBS Volume Lab

## Launch Instances in two AZs

1. Launch an instance using the Amazon Linux AMI in us-east-1a
2. Launch another instance using the Amazon Linux AMI in us-east-1b

## Create and Attach an EBS Volume
1. Create a 10GB gp2 volume in us-east-1a with a name tag of 'MyEBS'
2. List non-loopback block devices on instance
sudo lsblk -e7
3. Attach the volume to the instance in us-east-1a
4. Rerun the command to view block devices

## Create a filesystem and mount the volume
1. Create a filesystem on the EBS volume
sudo mkfs -t ext4 /dev/xvdy
2. Create a mount point for the EBS volume
sudo mkdir /data
3. Mount the EBS volume to the mount point
sudo mount /dev/xvdy /data
4. Make the volume mount persistent
Run: 'sudo nano /etc/fstab' then add '/dev/xvdy /data ext4 defaults,nofail 0 2' and save the file

## Add some data to the volume

1. Change to the /data mount point directory
2. Create some files and folders

## Take a snapshot and move the volume to us-east-1b

1. Take a snapshot of the data volume
2. Create a new EBS volume from the snapshot in us-east-1b
3. Mount the new EBS volume to the instance in us-east-1b
4. Change to the /data mount point and view the data

<hr>

# Lab 4: Working with EFS

## Launch instances in multiple AZs
1. Create a security group
aws ec2 create-security-group --group-name StorageLabs --description "Temporary SG for the Storage Service Labs"
2. Add a rule for SSH inbound to the security group
aws ec2 authorize-security-group-ingress --group-name StorageLabs --protocol tcp --port 22 --cidr 0.0.0.0/0
3. Launch instance in US-EAST-1A
aws ec2 run-instances --image-id ami-0440d3b780d96b29d --instance-type t2.micro --placement AvailabilityZone=us-east-1a --security-group-ids <SECURITY-GROUP-ID>
4. Launch instance in US-EAST-1B
aws ec2 run-instances --image-id ami-0440d3b780d96b29d --instance-type t2.micro --placement AvailabilityZone=us-east-1b --security-group-ids <SECURITY-GROUP-ID>

## Create an EFS File System
1. Add a rule to the security group to allow the NFS protocol from group members

```aws ec2 authorize-security-group-ingress --group-id <SECURITY-GROUP-ID> --protocol tcp --port 2049 --source-group <SECURITY-GROUP-ID>```

2. Create an EFS file system through the console, and add the StorageLabs security group to the mount targets for each AZ

## Mount using the NFS Client (perform steps on both instances)
1. Create an EFS mount point
mkdir ~/efs-mount-point
2. Install NFS client
sudo yum -y install nfs-utils
3. Mount using the EFS client
sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport <EFS-DNS-NAME>:/ ~/efs-mount-point
4. Create a file on the file system
5. Add a file system policy to enforce encryption in-transit
6. Unmount (make sure to change directory out of efs-mount-point first)
sudo umount ~/efs-mount-point
4. Mount again using the EFS client (what happens?)

## Mount using the EFS utils (perform steps on both instances)
1. Install EFS utils
sudo yum install -y amazon-efs-utils
2. Mount using the EFS mount helper
sudo mount -t efs -o tls <EFS-DNS-NAME>:/ ~/efs-mount-point

<hr>

# Lab 5: IMDS v1

## Example commmands to run:

1. Get the instance ID:
curl http://169.254.169.254/latest/meta-data/instance-id

2. Get the AMI ID:
curl http://169.254.169.254/latest/meta-data/ami-id

3. Get the instance type:
curl http://169.254.169.254/latest/meta-data/instance-type

4. Get the local IPv4 address:
curl http://169.254.169.254/latest/meta-data/local-ipv4

5. Get the public IPv4 address:
curl http://169.254.169.254/latest/meta-data/public-ipv4

## IMDS v2

## Step 1 - Create a session and get a token

TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

## Step 2 - Use the token to request metadata

1. Get the instance ID:
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id

2. Get the AMI ID:
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/ami-id

# Use metadata with user data to configure the instance

This script installs a web server and uses instance metadata to retrieve information about the instance and then output the information on a webpage.

```bash
#!/bin/bash

# Update system and install httpd (Apache)
yum update -y
yum install -y httpd

# Start httpd service and enable it to start on boot
systemctl start httpd
systemctl enable httpd

# Fetch metadata using IMDSv2
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AMI_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/ami-id)
INSTANCE_TYPE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type)

# Create a web page to display the metadata
cat <<EOF > /var/www/html/index.html
<html>
<head>
    <title>EC2 Instance Metadata</title>
</head>
<body>
    <h1>EC2 Instance Metadata</h1>
    <p>Instance ID: $INSTANCE_ID</p>
    <p>AMI ID: $AMI_ID</p>
    <p>Instance Type: $INSTANCE_TYPE</p>
</body>
</html>
EOF
```