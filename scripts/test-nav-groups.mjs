// Compatibility entry point for the current generated navigation journeys.
import { execFileSync } from 'node:child_process';
execFileSync('python3', ['tests/test_nav_generation.py'], { stdio: 'inherit' });
execFileSync('python3', ['tests/nav-browser.py'], { stdio: 'inherit' });
execFileSync('python3', ['tests/nav-dropdown-browser.py'], { stdio: 'inherit' });
