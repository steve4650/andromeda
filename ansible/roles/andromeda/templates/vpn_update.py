import argparse
import logging
import os
import sys

import requests

logging.basicConfig(level=logging.INFO)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Update Cloudflare A/AAAA DNS records using current public IPv4/IPv6 addresses."
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--ipv4-only",
        action="store_true",
        help="Only update the IPv4 A record",
    )
    group.add_argument(
        "--ipv6-only",
        action="store_true",
        help="Only update the IPv6 AAAA record",
    )
    return parser.parse_args()


def get_public_ip(url, address_family):
    response = requests.get(url)
    if response.status_code != 200:
        logging.error("Failed to retrieve %s address", address_family)
        sys.exit(1)
    ip = response.text.strip()
    logging.info("Retrieved %s address: %s", address_family, ip)
    return ip


def update_record(zone_id, record_id, record_type, ip, headers):
    response = requests.patch(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}",
        headers=headers,
        json={"type": record_type, "content": ip},
    )
    if response.ok:
        logging.info("Successfully updated %s DNS record to %s", record_type, ip)
        return
    logging.error(
        "Failed to update %s DNS record: %s, status code: %s",
        record_type,
        response.text,
        response.status_code,
    )
    sys.exit(1)


def main():
    args = parse_args()

    missing_vars = [
        var
        for var in (
            "CLOUDFLARE_API_TOKEN",
            "ZONE_ID",
            "A_DNS_RECORD_ID",
            "AAAA_DNS_RECORD_ID",
        )
        if not os.getenv(var)
    ]
    if missing_vars:
        logging.error(
            "Missing required environment variables: %s", ", ".join(missing_vars)
        )
        sys.exit(1)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.getenv('CLOUDFLARE_API_TOKEN')}",
    }

    if not args.ipv6_only:
        ip4 = get_public_ip("http://ip4.davisgroup.uk", "IPv4")
        update_record(
            os.getenv("ZONE_ID"),
            os.getenv("A_DNS_RECORD_ID"),
            "A",
            ip4,
            headers,
        )

    if not args.ipv4_only:
        ip6 = get_public_ip("http://ip6.davisgroup.uk", "IPv6")
        update_record(
            os.getenv("ZONE_ID"),
            os.getenv("AAAA_DNS_RECORD_ID"),
            "AAAA",
            ip6,
            headers,
        )


if __name__ == "__main__":
    main()
