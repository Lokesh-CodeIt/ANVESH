"""
Standalone Test Runner for Benchmark Integrity (Pure Python Standard Library)
"""
import sys
import os
import unittest

# Ensure root dir is in sys.path
sys.path.insert(0, os.path.abspath("."))

from tests.test_benchmark_integrity import (
    TestMetricFormulas,
    TestDataSplitIntegrity,
    TestJSONParsingRobustness
)
from tests.test_final_artifacts import TestFinalArtifacts
from tests.test_image_only_artifacts import TestImageOnlyArtifacts
from tests.test_image_only_diagnosis import TestImageOnlyDiagnosis

class MetricFormulasTestCase(unittest.TestCase, TestMetricFormulas):
    pass

class DataSplitIntegrityTestCase(unittest.TestCase, TestDataSplitIntegrity):
    pass

class JSONParsingRobustnessTestCase(unittest.TestCase, TestJSONParsingRobustness):
    pass

if __name__ == "__main__":
    loader = unittest.defaultTestLoader
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(MetricFormulasTestCase))
    suite.addTests(loader.loadTestsFromTestCase(DataSplitIntegrityTestCase))
    suite.addTests(loader.loadTestsFromTestCase(JSONParsingRobustnessTestCase))
    suite.addTests(loader.loadTestsFromTestCase(TestFinalArtifacts))
    suite.addTests(loader.loadTestsFromTestCase(TestImageOnlyArtifacts))
    suite.addTests(loader.loadTestsFromTestCase(TestImageOnlyDiagnosis))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
