import { useParams } from "react-router-dom";
import { useQuery, gql, useApolloClient } from "@apollo/client";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import DatasetUpload from "./DatasetUpload";
import DatasetList from "./DatasetList";
import ProjectMembers from "./ProjectMembers";

const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($id: uuid!) {
    projects_by_pk(id: $id) {
      id
      name
      datasets(where: {deleted_at: {_is_null: true}}, order_by: {created_at: desc}) {
        id
        file_name
        size_bytes
        status
        created_at
      }
    }
  }
`;

const ProjectDetails = () => {
  const { id } = useParams();
  const client = useApolloClient();
  const { loading, error, data, refetch } = useQuery(GET_PROJECT_DETAILS, {
    variables: { id },
    pollInterval: 5000, // Poll every 5s for status updates
  });

  const handleRefresh = async () => {
    // Clear Apollo cache for this query
    await client.cache.evict({ id: `projects_by_pk:${id}` });
    await client.cache.gc();
    // Then refetch
    await refetch();
  };

  if (loading) return <div className="p-8">Loading project...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  const project = data.projects_by_pk;
  
  // Get user role from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === "ADMIN";
  const isAnalyst = user?.role === "ANALYST";
  const canUpload = isAdmin || isAnalyst;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
        <Link to="/projects">
            <Button variant="ghost" className="pl-0 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
            </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white">{project.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{project.datasets.length} dataset(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 animate-slideInLeft">
           <DatasetList datasets={project.datasets} projectId={project.id} refresh={handleRefresh} canDelete={canUpload} />
        </div>
        <div className="space-y-6 animate-slideInRight">
           {canUpload && <DatasetUpload projectId={project.id} onUploadSuccess={handleRefresh} />}
           {(isAdmin || isAnalyst) && (
             <div>
               <ProjectMembers projectId={project.id} />
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
