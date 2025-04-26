import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, FileSearch, Video, AlertTriangle, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full h-screen w-screen m-0 p-0">
        <div className="bg-[#2D57ED] text-white h-full w-full overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-8">Welcome to PetPulse!</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 max-w-2xl mx-auto">
            <p className="text-xl font-semibold text-center">Here's what you can do with PetPulse:</p>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <div className="bg-white/10 p-3 rounded-full">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Symptom Checker</h3>
                  <p>Describe symptoms, upload photos, and let AI analyze potential issues.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <div className="bg-white/10 p-3 rounded-full">
                  <FileSearch className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Stool Analysis</h3>
                  <p>Get AI-driven insights into your pet's digestive health.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <div className="bg-white/10 p-3 rounded-full">
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Vet Consultations</h3>
                  <p>Schedule video or in-person vet appointments with ease.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <div className="bg-white/10 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Emergency Services</h3>
                  <p>Quickly locate nearby emergency vet clinics and get first-aid tips.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <div className="bg-white/10 p-3 rounded-full">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Health Dashboard</h3>
                  <p>Track vaccinations, medications, and overall wellness.</p>
                </div>
              </li>
            </ul>
            <p className="text-xl font-semibold text-center mt-8">
              Stay ahead of your pet's health—anytime, anywhere! 🐶🐱💙
            </p>
            <div className="flex justify-center mt-8">
              <Button onClick={onClose} className="bg-white text-[#2D57ED] hover:bg-white/90">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
