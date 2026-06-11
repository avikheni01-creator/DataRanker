import React, { useState, useCallback } from 'react';
import './ColumnMapper.css';
import { useNavigate } from 'react-router-dom';

/**
 * ColumnMapper Component - Enhanced with Auto-mapping
 * 
 * Workflow:
 * 1. User uploads CSV/Excel file
 * 2. Extract available columns from file
 * 3. Auto-map columns with EXACT MATCH (case-insensitive) against backend config
 * 4. User manually maps only unmapped columns
 * 5. Send final mapping to backend
 */

const ColumnMapper = ({ backendConfig = {}, setCOLUMN_MAPPING }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [autoMappedColumns, setAutoMappedColumns] = useState({}); // { backendMetric: csvColumn }
  const [unmappedColumns, setUnmappedColumns] = useState([]); // CSV columns not auto-mapped
  const [manualMappings, setManualMappings] = useState({}); // User manual mappings
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileDataPreview, setFileDataPreview] = useState([]);
  const navigate = useNavigate();

  /**
   * Auto-map columns using EXACT MATCH (case-insensitive) against backend config
   */
  const performAutoMapping = useCallback((csvColumns, configMetrics) => {
    const mapped = {};
    const unmapped = [];

    csvColumns.forEach(csvCol => {
      const originalMetric = Object.keys(configMetrics).find(
        key => configMetrics[key].toLowerCase().trim() === csvCol.toLowerCase().trim()
      );

      if (originalMetric) {
        mapped[originalMetric] = csvCol;
      } else {
        unmapped.push(csvCol);
      }
    });

    return { mapped, unmapped };
  }, []);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const columns = await extractColumnsFromFile(file);
      setUploadedFile(file);
      setAvailableColumns(columns);

      // Perform auto-mapping
      const { mapped, unmapped } = performAutoMapping(columns, backendConfig);
      setAutoMappedColumns(mapped);
      setUnmappedColumns(unmapped);
      setManualMappings({}); // Reset manual mappings

      // Get preview data
      const preview = await getFilePreview(file);
      if (preview && Array.isArray(preview)) {
        setFileDataPreview(preview);
      }
    } catch (err) {
      setError(`Error processing file: ${err.message}`);
      console.error('File processing error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [backendConfig, performAutoMapping]);

  /**
   * Extract columns from CSV or Excel file
   */
  const extractColumnsFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      return await extractColumnsFromCSV(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      return await extractColumnsFromExcel(file);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel file.');
    }
  };

  /**
   * Extract columns from CSV file
   */
  const extractColumnsFromCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          resolve(headers.filter(h => h.length > 0));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  /**
   * Extract columns from Excel file
   */
  const extractColumnsFromExcel = async (file) => {
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }

      return Object.keys(data[0]);
    } catch (err) {
      throw new Error(`Failed to read Excel file: ${err.message}`);
    }
  };

  /**
   * Get preview of file data (first 3 rows)
   */
  const getFilePreview = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      return await getCSVPreview(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      return await getExcelPreview(file);
    }
    return [];
  };

  const getCSVPreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').slice(0, 4);
          resolve(lines);
        } catch {
          resolve([]);
        }
      };
      reader.readAsText(file);
    });
  };

  const getExcelPreview = async (file) => {
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(worksheet);
      return data.slice(0, 3);
    } catch {
      return [];
    }
  };

  /**
   * Handle manual mapping for unmapped columns
   */
  const handleManualMapping = (csvColumn, backendMetric) => {
    if (backendMetric === '') {
      // Remove mapping if empty selected
      setManualMappings(prev => {
        const updated = { ...prev };
        delete updated[csvColumn];
        return updated;
      });
    } else {
      setManualMappings(prev => ({
        ...prev,
        [csvColumn]: backendMetric
      }));
    }
  };

  /**
   * Combine auto-mapped and manual mappings into final format
   */
  const buildFinalMapping = () => {
    // Convert from { backendMetric: csvColumn } to { csvColumn: backendMetric }
    const finalMapping = {};

    // Add auto-mapped (reverse the key-value)
    Object.entries(autoMappedColumns).forEach(([csvColumn, backendMetric]) => {
      finalMapping[csvColumn] = backendMetric;
    });

    // Add manual mappings
    Object.entries(manualMappings).forEach(([backendMetric, csvColumn]) => {
      finalMapping[csvColumn] = backendMetric;
    });

    return finalMapping;
  };

  /**
   * Validate and submit mapping
   */
  const handleSubmitMapping = async () => {
    // Check if all unmapped columns have been manually mapped
    const unmappedStillPending = unmappedColumns.filter(
      col => !manualMappings[col]
    );

    // if (unmappedStillPending.length > 0) {
    //   setError(
    //     `Please map these columns: ${unmappedStillPending.join(', ')}`
    //   );
    //   return;
    // }

    setIsLoading(true);
    try {
      const finalMapping = buildFinalMapping();

      // Format as array of objects for backend
      const mappingArray = [finalMapping];
      setCOLUMN_MAPPING(mappingArray);

      // onMappingComplete(mappingArray);
      navigate('/app'); // Redirect to pipeline
    } catch (err) {
      setError(`Error submitting mapping: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset all mappings
   */
  const handleReset = () => {
    setUploadedFile(null);
    setAvailableColumns([]);
    setAutoMappedColumns({});
    setUnmappedColumns([]);
    setManualMappings({});
    setFileDataPreview([]);
    setError(null);
  };

  const hasAutoMappings = Object.keys(autoMappedColumns).length > 0;
  const allMapped = unmappedColumns.length === 0 ||
    unmappedColumns.every(col => manualMappings[col]);

  return (
    <div className="column-mapper">
      <h2>🗂️ Column Mapping</h2>
      <p className="mapper-subtitle">Upload your data file and we'll automatically map your columns to our metrics</p>

      {/* File Upload Section */}
      <div className="mapper-section">
        <h3>Step 1: Upload Data File</h3>
        <div className="file-upload-area">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isLoading}
            id="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            {uploadedFile ? uploadedFile.name : 'Choose CSV or Excel file'}
          </label>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* File Preview */}
      {fileDataPreview.length > 0 && (
        <div className="mapper-section">
          <h3>File Preview</h3>
          <div className="preview-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {/* CSV previews are raw strings; Excel previews are row objects */}
                  {(typeof fileDataPreview[0] === 'string'
                    ? fileDataPreview[0].split(',')
                    : Object.keys(fileDataPreview[0] || {})
                  ).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileDataPreview.slice(1).map((row, idx) => (
                  <tr key={idx}>
                    {(typeof row === 'string'
                      ? row.split(',')
                      : Object.values(row)
                    ).map((cell, cellIdx) => (
                      <td key={cellIdx}>{String(cell || '').trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto-Mapped Columns */}
      {hasAutoMappings && (
        <div className="mapper-section auto-mapped-section">
          <h3>✅ Auto-Mapped Columns ({Object.keys(autoMappedColumns).length})</h3>
          <p className="instruction">These columns were automatically matched to your data</p>
          <div className="auto-mapped-grid">
            {Object.entries(autoMappedColumns).map(([backendMetric, csvColumn]) => (
              <div key={backendMetric} className="auto-mapped-item">
                <div className="auto-mapped-left">
                  <span className="csv-column">{csvColumn}</span>
                  <span className="arrow">→</span>
                  <span className="backend-metric">{backendMetric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Mapping for Unmapped Columns */}
      {unmappedColumns.length > 0 && (
        <div className="mapper-section manual-mapping-section">
          <h3>⚠️ Unmapped Columns ({unmappedColumns.length})</h3>
          <p className="instruction">Please map these columns to available metrics</p>
          <div className="manual-mapping-grid">
            {unmappedColumns.map(csvColumn => (
              <div key={csvColumn} className="manual-mapping-row">
                <label className="csv-column-label">{csvColumn}</label>
                <select
                  value={manualMappings[csvColumn] || ''}
                  onChange={(e) => handleManualMapping(csvColumn, e.target.value)}
                  className={`column-select ${manualMappings[csvColumn] ? 'mapped' : 'unmapped'
                    }`}
                >
                  <option value="">-- Select Metric --</option>
                  {Object.keys(backendConfig).map(metric => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                  <option value="skip" disabled>
                    -- Skip Column --
                  </option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {availableColumns.length > 0 && unmappedColumns.length === 0 && (
        <div className="success-message">
          ✨ All columns auto-mapped! Ready to proceed.
        </div>
      )}

      {/* Action Buttons */}
      {availableColumns.length > 0 && (
        <div className="mapper-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmitMapping}
            // disabled={isLoading || !allMapped}
            title={!allMapped ? 'Please map all unmapped columns' : ''}
          >
            {isLoading ? 'Processing...' : '✓ Confirm Mapping'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isLoading}
          >
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default ColumnMapper;
