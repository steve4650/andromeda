import sys
import requests
import logging
from dotenv import dotenv_values

logging.basicConfig(level=logging.INFO)
env = dotenv_values()

# Get IPs from ip4,6.davisgroup.uk
ip4_response = requests.get("http://ip4.davisgroup.uk")
if ip4_response.status_code != 200:
    logging.error("Failed to retrieve IPv4 address")
    sys.exit(1)
ip4 = ip4_response.text.strip()
logging.info(f"Retrieved IPv4 address: {ip4}")

ip6_response = requests.get("http://ip6.davisgroup.uk")
if ip6_response.status_code != 200:
    logging.error("Failed to retrieve IPv6 address")
    sys.exit(1)
ip6 = ip6_response.text.strip()
logging.info(f"Retrieved IPv6 address: {ip6}")

# Update Cloudflare DNS record with new IP
url = f"https://api.cloudflare.com/client/v4/zones/{env['ZONE_ID']}/dns_records/{env['DNS_RECORD_ID']}"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {env['CLOUDFLARE_API_TOKEN']}",
}
data = {"content": ip4}

ip4_response = requests.patch(url, headers=headers, json={"type": "A", "content": ip4})
if ip4_response.ok:
    logging.info(f"Successfully updated IPv4 DNS record to {ip4}")
else:
    logging.error(
        f"Failed to update IPv4 DNS record: {ip4_response.text}, status code: {ip4_response.status_code}"
    )
    sys.exit(1)

ip6_response = requests.patch(
    url, headers=headers, json={"type": "AAAA", "content": ip6}
)
if ip6_response.ok:
    logging.info(f"Successfully updated IPv6 DNS record to {ip6}")
else:
    logging.error(
        f"Failed to update IPv6 DNS record: {ip6_response.text}, status code: {ip6_response.status_code}"
    )
    sys.exit(1)
