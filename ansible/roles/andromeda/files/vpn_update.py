import sys
import requests
import logging
from dotenv import dotenv_values

logging.basicConfig(level=logging.INFO)
env = dotenv_values()

# Get IP from ip.davisgroup.uk
response = requests.get("http://ip.davisgroup.uk")
if response.status_code != 200:
    logging.error("Failed to retrieve IP address")
    sys.exit(1)

ip_address = response.text.strip()

logging.info(f"Retrieved IP address: {ip_address}")

# Update Cloudflare DNS record with new IP
url = f"https://api.cloudflare.com/client/v4/zones/{env['ZONE_ID']}/dns_records/{env['DNS_RECORD_ID']}"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {env['CLOUDFLARE_API_TOKEN']}",
}
data = {"content": ip_address}

response = requests.patch(url, headers=headers, json=data)
if response.status_code not in (200, 201):
    sys.exit(1)
