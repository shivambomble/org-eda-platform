import { useState } from "react";
import axios from "axios";
import { Upload, X, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { getToken } from "../../lib/auth";

interface UploadProps {
  projectId: string;
  onUploadSuccess: () => void;
}

const DatasetUpload = ({ projectId, onUploadSuccess }: UploadProps) => {
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const onSubmit = async (data: any) => {
    if (!data.file[0]) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", data.file[0]);

    try {
      await axios.post(
        `${API_URL}/api/projects/${projectId}/datasets`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      setSuccess(true);
      reset();
      onUploadSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 p-6 shadow-2xl animate-scaleIn">
      <h3 className="font-bold text-lg mb-6 text-white flex items-center gap-2">
        <div className="w-1 h-6 bg-blue-500 rounded"></div>
        <Upload className="w-5 h-5" /> Upload New Dataset
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Select CSV or Excel File</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            {...register("file", { required: true })}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>
        <Button 
          type="submit" 
          isLoading={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold btn-hover"
        >
          {loading ? 'Uploading...' : 'Upload Dataset'}
        </Button>
      </form>
      {error && (
        <div className="mt-4 p-3 bg-red-600/20 border border-red-500/50 rounded-lg flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-emerald-600/20 border border-emerald-500/50 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">Upload Successful</p>
        </div>
      )}
    </div>
  );
};

export default DatasetUpload;
