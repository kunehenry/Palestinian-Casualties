#!/usr/bin/env python3
"""
Palestinian Casualties Counter - Local Development Server

A simple HTTP server with CORS proxy functionality for fetching
casualties data from Tech for Palestine API endpoints.
"""

import http.server
import json
import os
import socketserver
import time
import urllib.error
import urllib.request
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse


class CORSProxyHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with CORS support and API proxy functionality."""

    # API endpoint mappings
    API_ENDPOINTS: Dict[str, str] = {
        '/api/gaza': 'https://data.techforpalestine.org/api/v2/casualties_daily.json',
        '/api/westbank': 'https://data.techforpalestine.org/api/v2/west_bank_daily.json'
    }

    # Server-side cache - stores (data, timestamp) tuples
    _cache: Dict[str, Tuple[bytes, float]] = {}

    # Cache configuration
    CACHE_TTL = 5 * 60  # 5 minutes cache
    CACHE_STALE_TTL = 30 * 60  # 30 minutes stale cache

    def end_headers(self) -> None:
        """Add CORS and cache control headers to all responses."""
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

        # Add cache control headers to prevent caching issues
        if self._should_disable_cache():
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.send_header('ETag', str(hash(self.path + str(time.time()))))

        super().end_headers()

    def _should_disable_cache(self) -> bool:
        """Determine if cache should be disabled for this request."""
        return (self.path.startswith('/api/') or
                self.path.endswith('.js') or
                self.path == '/')

    def do_OPTIONS(self) -> None:
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.end_headers()

    def do_GET(self) -> None:
        """Handle GET requests, routing API calls to proxy handler."""
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            super().do_GET()

    def _get_cached_data(self, cache_key: str) -> Optional[Tuple[bytes, bool]]:
        """
        Get cached data if available and valid.

        Returns:
            Tuple of (data, is_fresh) or None if no valid cache
        """
        if cache_key not in self._cache:
            return None

        data, timestamp = self._cache[cache_key]
        age = time.time() - timestamp

        if age < self.CACHE_TTL:
            return (data, True)  # Fresh cache
        elif age < self.CACHE_STALE_TTL:
            return (data, False)  # Stale but usable cache
        else:
            # Remove expired cache
            del self._cache[cache_key]
            return None

    def _set_cached_data(self, cache_key: str, data: bytes) -> None:
        """Store data in cache with current timestamp."""
        self._cache[cache_key] = (data, time.time())

    def handle_api_request(self) -> None:
        """
        Handle API proxy requests by fetching data from remote endpoints
        and returning it with appropriate headers. Uses server-side caching.
        """
        cache_key = self.path

        try:
            # Check cache first
            cached_result = self._get_cached_data(cache_key)

            if cached_result:
                data, is_fresh = cached_result
                if is_fresh:
                    print(f"Serving fresh cached data for {self.path}")
                    self._send_success_response(data)
                    return
                else:
                    print(f"Have stale cache for {self.path}, attempting refresh...")

            # Fetch new data
            remote_url = self._get_remote_url()
            if not remote_url:
                self.send_error(404, "API endpoint not found")
                return

            data = self._fetch_remote_data(remote_url)

            # Cache the new data
            self._set_cached_data(cache_key, data)
            print(f"Fetched and cached new data for {self.path}")

            self._send_success_response(data)

        except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
            print(f"Error fetching {self.path}: {e}")

            # Try to serve stale cache on error
            cached_result = self._get_cached_data(cache_key)
            if cached_result:
                data, _ = cached_result
                print(f"Serving stale cache due to error for {self.path}")
                self._send_success_response(data)
                return

            # No cache available, return error
            if isinstance(e, urllib.error.HTTPError):
                self.send_error(e.code, f"API Error: {e.reason}")
            elif isinstance(e, urllib.error.URLError):
                self.send_error(502, f"Connection Error: {e.reason}")
            else:
                self.send_error(500, f"Server Error: {str(e)}")

    def _get_remote_url(self) -> Optional[str]:
        """Get the remote URL for the requested API endpoint."""
        return self.API_ENDPOINTS.get(self.path)

    def _fetch_remote_data(self, url: str) -> bytes:
        """
        Fetch data from remote API endpoint with shorter timeout.

        Args:
            url: The remote API URL to fetch from

        Returns:
            The response data as bytes

        Raises:
            urllib.error.HTTPError: If HTTP request fails
            urllib.error.URLError: If URL is invalid or unreachable
        """
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Palestine-Casualties-Counter/1.0',
                'Accept': 'application/json'
            }
        )

        # Reduced timeout for better user experience
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.read()

    def _send_success_response(self, data: bytes) -> None:
        """Send successful response with JSON data."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(data)


def run_server(port: int = 8000) -> None:
    """
    Start the development server.

    Args:
        port: Port number to run the server on (default: 8000)
    """
    try:
        with socketserver.TCPServer(("", port), CORSProxyHandler) as httpd:
            print(f"Server running on http://localhost:{port}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {port} is already in use. Try a different port.")
        else:
            print(f"Error starting server: {e}")


if __name__ == "__main__":
    run_server()
