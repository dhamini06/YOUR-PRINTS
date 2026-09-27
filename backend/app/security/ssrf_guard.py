import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional


class SSRFValidationError(Exception):
    """Raised when a target host or URL resolves to a prohibited internal IP range."""
    pass


# Prohibited CIDR networks (RFC 1918, RFC 3927, RFC 5735, loopbacks, documentation, multicast)
PROHIBITED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.88.99.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::ffff:0:0/96"),
    ipaddress.ip_network("64:ff9b::/96"),
    ipaddress.ip_network("100::/64"),
    ipaddress.ip_network("2001::/23"),
    ipaddress.ip_network("2001:db8::/32"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("ff00::/8"),
]


def is_ip_prohibited(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address falls within prohibited/private networks."""
    for network in PROHIBITED_NETWORKS:
        if ip in network:
            return True
    return False


def validate_hostname_or_ip(host_or_ip: str) -> str:
    """
    Validate that a given hostname or IP string does not point to internal/private infrastructure.
    Returns the resolved valid public IP string or raises SSRFValidationError.
    """
    # 1. Direct IP check
    try:
        ip = ipaddress.ip_address(host_or_ip.strip("[]"))
        if is_ip_prohibited(ip):
            raise SSRFValidationError(f"Access to private/prohibited IP address '{ip}' is blocked.")
        return str(ip)
    except ValueError:
        pass  # It's a hostname, proceed to DNS resolution

    # 2. Hostname resolution check
    try:
        addr_info = socket.getaddrinfo(host_or_ip, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if is_ip_prohibited(ip):
                raise SSRFValidationError(
                    f"Hostname '{host_or_ip}' resolves to prohibited IP address '{ip_str}'."
                )
        return host_or_ip
    except socket.gaierror as e:
        raise SSRFValidationError(f"Could not resolve host '{host_or_ip}': {e}")


def validate_url(url: str) -> Tuple[str, str]:
    """
    Validate a complete URL scheme and host against SSRF.
    Returns (scheme, hostname).
    """
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFValidationError(f"Prohibited URL scheme '{parsed.scheme}'. Only HTTP/HTTPS permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("URL does not specify a valid hostname.")

    validate_hostname_or_ip(hostname)
    return parsed.scheme, hostname
